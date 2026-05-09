import type {NextFunction, Request, Response} from "express";
import {successResponse} from "../../common/utils/response.success";
import {CreatePostDTO} from "./post.dto";
import PostRepository from "../../DB/repositories/post.repository";
import {AppError} from "../../common/utils/global-error-handling";
import {Types} from "mongoose";
import redisService from "../../common/utils/services/redis.service";
import {S3Service} from "../../common/utils/services/s3.service";
import {randomUUID} from "node:crypto";
import {StoreEnum} from "../../common/enum/multer.enum";
import {IPost} from "../../DB/models/post.model";
import notificationService from "../../common/utils/services/notification.service";
import UserRepository from "../../DB/repositories/user.repository";
import {AvailabilityEnum, LikeEnum} from "../../common/enum/post.enum";
import {AvailabilityPost} from "../../common/utils/posts.utils";

class PostService {
  private readonly _postRepo = new PostRepository();
  private readonly _userRepo = new UserRepository();
  private readonly _redisService = redisService;
  private readonly _notificationService = notificationService;

  private readonly _s3Service = new S3Service();

  constructor() {}

  createPost = async (req: Request, res: Response, next: NextFunction) => {
    let {
      allowComments,
      availability,
      attachments,
      content,
      tags,
    }: CreatePostDTO = req.body;

    let mentions: Types.ObjectId[] = [];
    let FCMTokens: string[] = [];

    if (tags?.length) {
      const mentionsTags = await this._userRepo.find({
        filter: {
          _id: {$in: tags},
        },
      });
      if (tags?.length != mentionsTags.length) {
        throw new AppError("Invaild Tag ID", 404);
      }

      for (const mention of mentionsTags) {
        (mentions.push(mention._id),
          (await this._redisService.getFCMs(mention._id)).map((token) =>
            FCMTokens.push(token),
          ));
      }
    }

    let urls: string[] = [];
    const folderId = randomUUID();
    if (req?.files) {
      urls = await this._s3Service.uploadFiles({
        files: req.files as Express.Multer.File[],
        path: `users/${req.user._id}/posts/${folderId}`,
        store_type: StoreEnum.memory,
      });
    }

    const post = await this._postRepo.create({
      data: {
        attachments: urls,
        tags: mentions,
        content: content!,
        allowComments,
        availability,
        createdBy: req?.user?._id!,
        folderId,
      } as Partial<IPost>,
    });

    if (!post) {
      await this._s3Service.deleteFiles(urls);
      throw new AppError("Fail To Create Post", 400);
    }

    if (FCMTokens.length) {
      await this._notificationService.sendNotifications({
        tokens: FCMTokens,
        data: {
          title: `${req.user.firstName} ${req.user.lastName} Mentioned You In A Post`,
          body: content || "Mention",
        },
      });
    }

    successResponse({
      res,
      message: "Post Created Successfully !",
      status: 201,
      data: post,
    });
  };

  getPosts = async (req: Request, res: Response, next: NextFunction) => {
    const posts = await this._postRepo.paginate({
      page: +req.query.page!,
      limit: +req.query.limit!,
      search: {
        ...AvailabilityPost(req),
        ...(req.query.search
          ? {
              $or: [{content: {$regex: req.query?.search, $options: "i"}}],
            }
          : {}),
      },
    });

    successResponse({
      res,
      data: posts,
    });
  };

  likePost = async (req: Request, res: Response, next: NextFunction) => {
    const {postId} = req.params;
    const {flag} = req.query;

    let updateQuery: any = {
      $addToSet: {likes: req.user?._id},
    };
    if (flag && flag === LikeEnum.disLike) {
      updateQuery = {
        $pull: {likes: req.user?._id},
      };
    }

    const post = await this._postRepo.findOneAndUpdate({
      filter: {
        _id: postId,
        ...AvailabilityPost(req),
      },
      update: updateQuery,
    });

    if (!post) {
      throw new AppError("Post Not Found Or You Are Not Authorized !", 404);
    }

    successResponse({
      res,
      data: post,
    });
  };
}

export default new PostService();
