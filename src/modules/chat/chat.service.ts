import {Request, Response} from "express";
import UserRepository from "../../DB/repositories/user.repository";
import ChatRepository from "../../DB/repositories/chat.repository";
import {AppError} from "../../common/utils/global-error-handling";
import {successResponse} from "../../common/utils/response.success";
import {Server, Socket} from "socket.io";
import redisService from "../../common/utils/services/redis.service";
import {CreateGroupDto} from "./chat.dto";
import {Types} from "mongoose";
import {S3Service} from "../../common/utils/services/s3.service";
import {randomUUID} from "node:crypto";

class ChatService {
  private readonly _userRepo = new UserRepository();
  private readonly _chatRepo = new ChatRepository();
  private readonly _s3Service = new S3Service();
  constructor() {}

  // REST API

  getChat = async (req: Request, res: Response) => {
    const {userId} = req.params;
    let {page, limit = 5} = req.query as unknown as {
      page: number;
      limit: number;
    };

    if (page < 0 || !page) page = 1;
    page = page * 1 || 1;
    limit = limit * 1 || 5;
    const chat = await this._chatRepo.findOne({
      filter: {
        participants: {
          $all: [req.user._id, userId],
        },
        group: {
          $exists: false,
        },
      },
      projection: {
        messages: {
          $slice: [-(page * limit), limit],
        },
      },
      options: {
        populate: [
          {
            path: "participants",
          },
        ],
      },
    });

    if (!chat) {
      throw new AppError("Chat Not Found", 400);
    }

    successResponse({
      res,
      message: "Done",
      status: 200,
      data: chat,
    });
  };

  getGroupChat = async (req: Request, res: Response) => {
    const {groupId} = req.params;
    // let {page, limit = 5} = req.query as unknown as {
    //   page: number;
    //   limit: number;
    // };

    // if (page < 0 || !page) page = 1;
    // page = page * 1 || 1;
    // limit = limit * 1 || 5;
    const chat = await this._chatRepo.findOne({
      filter: {
        _id: groupId,
        participants: {
          $in: [req.user._id],
        },
        group: {
          $exists: true,
        },
      },
      options: {
        populate: [
          {
            path: "messages.createdBy",
          },
        ],
      },
    });

    if (!chat) {
      throw new AppError("Chat Not Found", 400);
    }

    successResponse({
      res,
      message: "Done",
      status: 200,
      data: chat,
    });
  };

  createChatGroup = async (req: Request, res: Response) => {
    let {participants, group}: CreateGroupDto = req.body;
    let groupImage = "";
    const createdBy = req?.user._id!;

    const convertParticipants: Types.ObjectId[] = participants.map(
      (id: string) => {
        return Types.ObjectId.createFromHexString(id);
      },
    );

    const users = await this._userRepo.find({
      filter: {
        _id: {
          $in: convertParticipants,
        },
        friends: {
          $in: [createdBy],
        },
      },
    });

    if (users.length !== participants.length) {
      throw new AppError("some users not found", 404);
    }

    const roomId = group.replaceAll(/\s+/g, "-") + "_" + randomUUID();
    if (req?.file) {
      groupImage = await this._s3Service.uploadFile({
        file: req.file as Express.Multer.File,
        path: `chat/${roomId}`,
      });
    }

    convertParticipants.push(createdBy);
    const chat = await this._chatRepo.create({
      data: {
        createdBy,
        group,
        groupImage,
        participants: convertParticipants,
        roomId,
        messages: [],
      },
    });

    if (!chat) {
      if (groupImage) {
        await this._s3Service.deleteFile(groupImage);
      }
      throw new AppError("Chat Not Found", 404);
    }

    successResponse({
      res,
      message: "Done",
      status: 200,
      data: chat,
    });
  };

  // Socket.io

  sayHi = async (data: any) => {};

  join_room = async (data: any, socket: Socket, io: Server) => {
    const {roomId} = data;

    const chat = await this._chatRepo.findOne({
      filter: {
        roomId,
        participants: {
          $in: [socket.data.user._id],
        },
        group: {$exists: true},
      },
    });

    if (!chat) {
      throw new AppError("Group Not Found", 404);
    }

    socket.join(chat?.roomId!);
  };

  sendMessage = async (data: any, socket: Socket, io: Server) => {
    const {sendTo, content} = data;
    const createdBy = socket.data.user._id;
    await this._userRepo.checkUserExistById(sendTo);

    const chat = await this._chatRepo.findOneAndUpdate({
      filter: {
        participants: {
          $all: [sendTo, createdBy],
        },
        group: {$exists: false},
      },
      update: {
        $push: {
          messages: {
            content,
            createdBy,
          },
        },
      },
    });

    if (!chat) {
      await this._chatRepo.create({
        data: {
          participants: [sendTo, createdBy],
          createdBy,
          messages: [
            {
              content,
              createdBy,
            },
          ],
        },
      });
    }

    io.to(await redisService.getSockets(createdBy)).emit("successMessage", {
      content,
    });

    io.to(await redisService.getSockets(sendTo)).emit("newMessage", {
      content,
      from: socket.data.user,
    });
  };

  sendGroupMessage = async (data: any, socket: Socket, io: Server) => {
    const {groupId, content} = data;
    const createdBy = socket.data.user._id;

    const chat = await this._chatRepo.findOneAndUpdate({
      filter: {
        _id: groupId,
        participants: {
          $all: [createdBy],
        },
        group: {$exists: true},
      },
      update: {
        $push: {
          messages: {
            content,
            createdBy,
          },
        },
      },
    });

    if (!chat) {
      throw new AppError("Chat Not Found !", 404);
    }

    io.to(await redisService.getSockets(createdBy)).emit("successMessage", {
      content,
    });

    io.to(chat.roomId).emit("newMessage", {
      content,
      from: socket.data.user,
      groupId,
    });
  };
}

export default new ChatService();
