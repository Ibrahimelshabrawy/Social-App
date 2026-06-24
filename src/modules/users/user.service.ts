import type {NextFunction, Request, Response} from "express";
import {successResponse} from "../../common/utils/response.success";
import UserRepository from "../../DB/repositories/user.repository";
import CommentRepository from "../../DB/repositories/comment.repository";
import PostRepository from "../../DB/repositories/post.repository";
import {AppError} from "../../common/utils/global-error-handling";
import {Types} from "mongoose";
import {OnModelEnum} from "../../common/enum/post.enum";
import ChatRepository from "../../DB/repositories/chat.repository";

class UserService {
  private readonly _userRepo = new UserRepository();
  private readonly _postRepo = new PostRepository();
  private readonly _commentRepo = new CommentRepository();
  private readonly _chatRepo = new ChatRepository();

  constructor() {}

  getProfile = async (req: Request, res: Response, next: NextFunction) => {
    const user = await this._userRepo.findOne({
      filter: {_id: req.user?._id as Types.ObjectId},
      options: {
        populate: [
          {
            path: "friends",
          },
        ],
      },
    });

    const groups = await this._chatRepo.find({
      filter: {
        participants: {$in: [req.user._id!]},
        group: {$exists: true},
      },
    });
    successResponse({
      res,
      message: "User Profile Is Here 🥳",
      data: {user, groups},
    });
  };

  getSavedPosts = async (req: Request, res: Response, next: NextFunction) => {
    const page = +req?.query.page! || 1;
    const limit = +req?.query.limit! || 5;

    const skip = (page - 1) * limit;

    const user = await this._userRepo.findOne({
      filter: {
        _id: req?.user._id,
      },
      options: {
        projection: {
          savedPosts: 1,
          _id: 0,
        },
        skip,
        limit,
        sort: {
          createdAt: -1,
        },
        lean: true,
      },
    });

    successResponse({
      res,
      message: "Saved Posts Is Here 🥳",
      data: {page, limit, skip, savedPosts: user?.savedPosts || []},
    });
  };

  getUserPosts = async (req: Request, res: Response, next: NextFunction) => {
    const {userId} = req.params;

    const user = await this._userRepo.findById({
      id: userId as unknown as Types.ObjectId,
    });

    if (!user) {
      throw new AppError("User Not Found !", 404);
    }

    const posts = await this._postRepo.paginate({
      page: +req.query.page!,
      limit: +req.query.limit!,

      search: {
        createdBy: userId,
        isDeleted: false,
      },

      sort: {
        createdAt: -1,
      },

      populate: [
        {
          path: "createdBy",
          select: "firstName lastName profilePic",
        },

        {
          path: "tags",
          select: "firstName lastName userName profilePic",
        },
      ],
    });

    successResponse({
      res,
      data: posts,
    });
  };
  getUserComments = async (req: Request, res: Response, next: NextFunction) => {
    const {userId} = req.params;

    const comments = await this._commentRepo.paginate({
      page: +req.query.page!,
      limit: +req.query.limit!,

      search: {
        createdBy: userId,
        onModel: OnModelEnum.Post,
        isDeleted: false,
      },

      sort: {
        createdAt: -1,
      },

      populate: [
        {
          path: "createdBy",

          select: "firstName lastName profilePic",
        },

        {
          path: "refId",
        },
      ],
    });

    successResponse({
      res,
      data: comments,
    });
  };

  getUserReplies = async (req: Request, res: Response, next: NextFunction) => {
    const {userId} = req.params;

    const replies = await this._commentRepo.paginate({
      page: +req.query.page!,
      limit: +req.query.limit!,

      search: {
        createdBy: userId,
        onModel: OnModelEnum.Comment,
        isDeleted: false,
      },

      sort: {
        createdAt: -1,
      },

      populate: [
        {
          path: "createdBy",

          select: "firstName lastName profilePic",
        },

        {
          path: "refId",
        },
      ],
    });

    successResponse({
      res,
      data: replies,
    });
  };
}

export default new UserService();
