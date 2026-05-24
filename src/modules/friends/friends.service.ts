import type {NextFunction, Request, Response} from "express";
import {successResponse} from "../../common/utils/response.success";
import PostRepository from "../../DB/repositories/post.repository";
import {AppError} from "../../common/utils/global-error-handling";
import {Types} from "mongoose";
import redisService from "../../common/utils/services/redis.service";
import {S3Service} from "../../common/utils/services/s3.service";
import notificationService from "../../common/utils/services/notification.service";
import UserRepository from "../../DB/repositories/user.repository";
import CommentRepository from "../../DB/repositories/comment.repository";
import notificationRepository from "../../DB/repositories/notification.repository";
import StoryRepository from "../../DB/repositories/story.repository";
import FriendRequestRepository from "../../DB/repositories/friend-request.repository";
import {NotificationTypeEnum} from "../../common/enum/notification.enum";
import {FriendRequestStatusEnum} from "../../common/enum/user.enum";

class FriendService {
  private readonly _postRepo = new PostRepository();
  private readonly _userRepo = new UserRepository();
  private readonly _storyRepo = new StoryRepository();
  private readonly _commentRepo = new CommentRepository();
  private readonly _friendRequestRepo = new FriendRequestRepository();
  private readonly _redisService = redisService;
  private readonly _notificationService = notificationService;
  private readonly _notificationRepo = notificationRepository;

  private readonly _s3Service = new S3Service();

  constructor() {}

  sendFriendRequest = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    const {receiverId} = req.params;

    if (receiverId === req.user._id.toString()) {
      throw new AppError("You Cannot Send Request To Yourself !", 400);
    }

    const receiver = await this._userRepo.findById({
      id: receiverId as unknown as Types.ObjectId,
    });

    if (!receiver) {
      throw new AppError("Receiver Not Found !", 404);
    }

    const alreadyFriends = req.user.friends?.some(
      (friendId) => friendId.toString() === receiverId,
    );

    if (alreadyFriends) {
      throw new AppError("You Are Already Friends !", 400);
    }

    const existingRequest = await this._friendRequestRepo.findOne({
      filter: {
        $or: [
          {
            senderId: req.user._id!,
            receiverId: receiverId!,
          },

          {
            senderId: receiverId!,
            receiverId: req.user._id,
          },
        ],
      },
    });
    if (existingRequest) {
      if (existingRequest.status === FriendRequestStatusEnum.pending) {
        throw new AppError("Friend Request Already Exists !", 400);
      }

      if (existingRequest.status === FriendRequestStatusEnum.rejected) {
        existingRequest.status = FriendRequestStatusEnum.pending;

        await existingRequest.save();
        await this._notificationRepo.sendNotificationRequest({
          senderId: req.user._id,
          receiverId: receiver._id,
          title:
            `${req.user.firstName} ` +
            `${req.user.lastName} sent you a friend request`,
          body: "Friend Request",
          type: NotificationTypeEnum.follow,
        });

        return successResponse({
          res,
          message: "Friend Request Sent Again 🥳",
          data: existingRequest,
        });
      }
    }

    const request = await this._friendRequestRepo.create({
      data: {
        senderId: req.user._id,
        receiverId: receiverId as unknown as Types.ObjectId,
      },
    });
    await this._notificationRepo.sendNotificationRequest({
      senderId: req.user._id,
      receiverId: receiver._id,
      title:
        `${req.user.firstName} ` +
        `${req.user.lastName} sent you a friend request`,
      body: "Friend Request",
      type: NotificationTypeEnum.follow,
    });

    successResponse({
      res,
      message: "Friend Request Sent Successfully 🥳",
      status: 201,
      data: request,
    });
  };

  acceptFriendRequest = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    const {requestId} = req.params;

    const request = await this._friendRequestRepo.findOne({
      filter: {
        _id: requestId,
        status: FriendRequestStatusEnum.pending,
      },
    });

    if (!request) {
      throw new AppError("Friend Request Not Found !", 404);
    }

    if (request.receiverId.toString() !== req.user._id.toString()) {
      throw new AppError("You Are Not Authorized !", 403);
    }
    // Add Receiver To Sender Friends
    await this._userRepo.findOneAndUpdate({
      filter: {
        _id: request.senderId,
      },

      update: {
        $addToSet: {
          friends: request.receiverId,
        },
      },
    });

    // Add Sender To Receiver Friends
    await this._userRepo.findOneAndUpdate({
      filter: {
        _id: request.receiverId,
      },

      update: {
        $addToSet: {
          friends: request.senderId,
        },
      },
    });

    request.status = FriendRequestStatusEnum.accepted;
    await request.save();

    await this._notificationRepo.sendNotificationRequest({
      senderId: req.user._id,
      receiverId: request.senderId,
      title:
        `${req.user.firstName} ` +
        `${req.user.lastName} accepted your friend request`,

      body: "Friend Request Accepted",
      type: NotificationTypeEnum.follow,
    });

    successResponse({
      res,
      message: "Friend Request Accepted Successfully 🥳",
      data: request,
    });
  };

  rejectFriendRequest = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    const {requestId} = req.params;
    const request = await this._friendRequestRepo.findOne({
      filter: {
        _id: requestId,

        status: FriendRequestStatusEnum.pending,
      },
    });

    if (!request) {
      throw new AppError("Friend Request Not Found !", 404);
    }

    if (request.receiverId.toString() !== req.user._id.toString()) {
      throw new AppError("You Are Not Authorized !", 403);
    }

    request.status = FriendRequestStatusEnum.rejected;
    await request.save();

    successResponse({
      res,
      message: "Friend Request Rejected Successfully 🥳",
      data: request,
    });
  };

  cancelFriendRequest = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    const {requestId} = req.params;

    const request = await this._friendRequestRepo.findOne({
      filter: {
        _id: requestId,
        status: FriendRequestStatusEnum.pending,
      },
    });

    if (!request) {
      throw new AppError("Friend Request Not Found !", 404);
    }

    if (request.senderId.toString() !== req.user._id.toString()) {
      throw new AppError("You Are Not Authorized !", 403);
    }

    await request.deleteOne();

    successResponse({
      res,
      message: "Friend Request Cancelled Successfully 🥳",
    });
  };

  unfriend = async (req: Request, res: Response, next: NextFunction) => {
    const {friendId} = req.params;

    if (friendId === req.user._id.toString()) {
      throw new AppError("You Cannot Unfriend Yourself !", 400);
    }

    const friend = await this._userRepo.findById({
      id: friendId as unknown as Types.ObjectId,
    });

    if (!friend) {
      throw new AppError("Friend Not Found !", 404);
    }

    const isFriend = req.user.friends?.some((id) => id.toString() === friendId);

    if (!isFriend) {
      throw new AppError("You Are Not Friends !", 400);
    }

    await this._userRepo.findOneAndUpdate({
      filter: {
        _id: req.user._id,
      },

      update: {
        $pull: {
          friends: friendId,
        },
      },
    });

    await this._userRepo.findOneAndUpdate({
      filter: {
        _id: friendId as unknown as Types.ObjectId,
      },

      update: {
        $pull: {
          friends: req.user._id,
        },
      },
    });

    await this._friendRequestRepo.deleteOne({
      filter: {
        $or: [
          {
            senderId: req.user._id,
            receiverId: friendId!,
          },

          {
            senderId: friendId!,
            receiverId: req.user._id,
          },
        ],
      },
    });

    successResponse({
      res,
      message: "Unfriend Successfully 🥳",
    });
  };

  getIncomingFriendRequests = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    const requests = await this._friendRequestRepo.paginate({
      page: +req.query.page!,
      limit: +req.query.limit!,

      search: {
        receiverId: req.user._id,
        status: FriendRequestStatusEnum.pending,
      },

      populate: [
        {
          path: "senderId",
          select: "firstName lastName profilePicture",
        },
      ],

      sort: {
        createdAt: -1,
      },
    });

    successResponse({
      res,
      message: "Incoming Friend Requests 🥳",
      data: requests,
    });
  };

  getSentFriendRequests = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    const requests = await this._friendRequestRepo.paginate({
      page: +req.query.page!,
      limit: +req.query.limit!,

      search: {
        senderId: req.user._id,
        status: FriendRequestStatusEnum.pending,
      },

      populate: [
        {
          path: "receiverId",
          select: "firstName lastName profilePicture",
        },
      ],

      sort: {
        createdAt: -1,
      },
    });

    successResponse({
      res,
      message: "Sent Friend Requests 🥳",
      data: requests,
    });
  };

  getFriendsList = async (req: Request, res: Response, next: NextFunction) => {
    const user = await this._userRepo.findOne({
      filter: {
        _id: req.user._id,
      },

      options: {
        populate: [
          {
            path: "friends",
            select: "firstName lastName profilePicture",
            options: {
              sort: {
                createdAt: -1,
              },
            },
          },
        ],
      },
    });

    if (!user) {
      throw new AppError("User Not Found !", 404);
    }

    successResponse({
      res,
      message: "Friends List 🥳",
      data: user.friends || [],
    });
  };
}

export default new FriendService();
