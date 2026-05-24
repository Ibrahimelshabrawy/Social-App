import type {NextFunction, Request, Response} from "express";
import {successResponse} from "../../common/utils/response.success";
import {CreateCommentDTO, updateCommentDTO} from "./comment.dto";
import PostRepository from "../../DB/repositories/post.repository";
import {AppError} from "../../common/utils/global-error-handling";
import {HydratedDocument, Types} from "mongoose";
import redisService from "../../common/utils/services/redis.service";
import {S3Service} from "../../common/utils/services/s3.service";
import {randomUUID} from "node:crypto";
import {StoreEnum} from "../../common/enum/multer.enum";
import {IPost} from "../../DB/models/post.model";
import notificationService from "../../common/utils/services/notification.service";
import UserRepository from "../../DB/repositories/user.repository";
import {
  AllowCommentEnum,
  AvailabilityEnum,
  OnModelEnum,
} from "../../common/enum/post.enum";
import {AvailabilityPost} from "../../common/utils/posts.utils";
import CommentRepository from "../../DB/repositories/comment.repository";
import {IComment} from "../../DB/models/comment.model";
import {reactPostDTO} from "../posts/post.dto";
import {NotificationTypeEnum} from "../../common/enum/notification.enum";
import notificationRepository from "../../DB/repositories/notification.repository";

class CommentService {
  private readonly _postRepo = new PostRepository();
  private readonly _userRepo = new UserRepository();
  private readonly _commentRepo = new CommentRepository();
  private readonly _redisService = redisService;
  private readonly _notificationService = notificationService;
  private readonly _notificationRepo = notificationRepository;

  private readonly _s3Service = new S3Service();

  constructor() {}

  createCommentOrReply = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    let {content, tags, onModel}: CreateCommentDTO = req.body;
    const {postId, commentId} = req.params;

    let doc: HydratedDocument<IPost | IComment> | null = null;

    if (onModel === OnModelEnum.Post && !commentId) {
      // Handle comment creation for a post
      doc = await this._postRepo.findOne({
        filter: {
          _id: postId,
          $or: AvailabilityPost(req),
          allowComments: AllowCommentEnum.allow,
        },
      });

      if (!doc) {
        throw new AppError("Post Not Found Or You Are Not Authorized", 404);
      }
    } else if (onModel === OnModelEnum.Comment && commentId) {
      // Handle reply creation for a comment
      let comment = await this._commentRepo.findOne({
        filter: {
          _id: commentId!,
          refId: postId!,
        },
        options: {
          populate: [
            {
              path: "refId",
              match: {
                $or: AvailabilityPost(req),
                allowComments: AllowCommentEnum.allow,
              },
            },
          ],
        },
      });
      if (!comment || !comment?.refId) {
        throw new AppError("Comment Not Found Or You Are Not Authorized", 404);
      }

      doc = comment;
    }

    if (!doc) {
      throw new AppError(
        "Post Or Comment Not Found Or You Are Not Authorized",
        404,
      );
    }

    let mentions: Types.ObjectId[] = [];
    let FCMTokens: string[] = [];

    if (tags?.length) {
      const mentionsTags = await this._userRepo.find({
        filter: {
          _id: {$in: tags},
        },
      });
      if (tags?.length != mentionsTags.length) {
        throw new AppError("Invalid Tag ID", 404);
      }

      for (const mention of mentionsTags) {
        if (mention._id.toString() === req?.user?._id.toString()) {
          throw new AppError("Cannot Mention Yourself !", 400);
        }
        (mentions.push(mention._id),
          (await this._redisService.getFCMs(mention._id)).map((token) =>
            FCMTokens.push(token),
          ));
      }
    }

    let urls: string[] = [];
    const folderId = randomUUID();

    let path = "";

    // Create Comment
    if (onModel === OnModelEnum.Post) {
      const post = doc as HydratedDocument<IPost>;

      path = `users/${req.user._id}/posts/${post.folderId}/comments/${folderId}`;
    }

    // Create Reply
    if (onModel === OnModelEnum.Comment) {
      const comment = doc as HydratedDocument<IComment>;

      const post = await this._postRepo.findById({
        id: comment.refId as Types.ObjectId,
      });

      if (!post) {
        throw new AppError("Post Not Found !", 404);
      }

      path =
        `users/${req.user._id}` +
        `/posts/${post.folderId}` +
        `/comments/${comment.folderId}` +
        `/replies/${folderId}`;
    }

    if (req?.files) {
      urls = await this._s3Service.uploadFiles({
        files: req.files as Express.Multer.File[],
        path,
        store_type: StoreEnum.memory,
      });
    }

    const comment = await this._commentRepo.create({
      data: {
        attachments: urls,
        tags: mentions,
        content: content!,
        createdBy: req?.user?._id!,
        folderId,
        refId: doc?._id,
        onModel,
      } as Partial<IComment>,
    });

    if (!comment) {
      await this._s3Service.deleteFiles(urls);
      throw new AppError("Fail To Create Comment", 400);
    }

    if (FCMTokens.length) {
      await this._notificationService.sendNotifications({
        tokens: FCMTokens,
        data: {
          title: `${req.user.firstName} ${req.user.lastName} Commented In Your Post`,
          body: content || "Comment",
        },
      });
    }

    successResponse({
      res,
      message: "Comment Created Successfully !",
      status: 201,
      data: comment,
    });
  };

  getCommentsWithReplies = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    const {postId} = req.params;
    const {page, limit} = req.query;

    const comments = await this._commentRepo.paginate({
      page: +page!,
      limit: +limit!,
      search: {
        refId: postId!,
      },
      populate: [
        {
          path: "replies",
        },
      ],
    });
    if (!comments) {
      throw new AppError("No Comments Found !", 404);
    }

    successResponse({
      res,
      message: "Comments fetched Successfully !",
      status: 201,
      data: comments,
    });
  };

  deleteCommentWithReplies = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    const {commentId} = req.params;
    const comment = await this._commentRepo.findById({
      id: commentId as unknown as Types.ObjectId,
    });

    if (!comment) {
      throw new AppError("Comment Not Found !", 404);
    }
    if (!comment.createdBy.equals(req.user._id)) {
      throw new AppError(
        "You Are Not Authorized To Delete This Comment !",
        403,
      );
    }
    await comment.deleteOne();
    successResponse({
      res,
      message: "Comment Deleted Successfully !",
      status: 200,
    });
  };

  deleteReply = async (req: Request, res: Response, next: NextFunction) => {
    const {replyId} = req.params;

    const reply = await this._commentRepo.findById({
      id: replyId as unknown as Types.ObjectId,
    });

    if (!reply) {
      throw new AppError("Reply Not Found !", 404);
    }

    if (reply.onModel !== OnModelEnum.Comment) {
      throw new AppError("This Is Not A Reply !", 400);
    }

    if (!reply.createdBy.equals(req.user._id)) {
      throw new AppError("You Are Not Authorized To Delete This Reply !", 403);
    }

    await reply.deleteOne();

    successResponse({
      res,
      message: "Reply Deleted Successfully !",
      status: 200,
    });
  };

  updateCommentOrReply = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    let {
      attachments,
      content,
      tags,
      removeAttachments,
      removeTags,
    }: updateCommentDTO = req.body;

    const {commentId} = req.params;

    const comment = await this._commentRepo.findOne({
      filter: {
        _id: commentId,
        isDeleted: false,
      },
    });

    if (!comment) {
      throw new AppError("comment Not Found !", 404);
    }

    if (!comment.createdBy.equals(req.user._id)) {
      throw new AppError(
        "You Are Not Authorized To Update This Comment !",
        403,
      );
    }

    let FCMTokens: string[] = [];

    if (removeAttachments?.length) {
      const inValidAttachments = removeAttachments.filter((attachment) => {
        return !comment?.attachments?.includes(attachment);
      });

      if (inValidAttachments?.length) {
        throw new AppError("There Is An Attachment Than Not Exist", 404);
      }
      comment.attachments = comment?.attachments?.filter((attachment) => {
        return !removeAttachments.includes(attachment);
      }) as string[];
    }

    const updateTags = new Set(
      (comment?.tags || []).map((id) => id.toString()),
    );

    removeTags?.forEach((tag: string) => {
      return updateTags.delete(tag);
    });

    if (tags?.length) {
      const mentionsTags = await this._userRepo.find({
        filter: {
          _id: {$in: tags},
        },
      });
      if (tags?.length != mentionsTags.length) {
        throw new AppError("Invalid Tag ID", 404);
      }

      for (const mention of mentionsTags) {
        if (mention._id.toString() == req?.user?._id.toString()) {
          throw new AppError("You Cannot Mention Yourself", 400);
        }
        (updateTags.add(mention._id.toString()),
          (await this._redisService.getFCMs(mention._id)).map((token) =>
            FCMTokens.push(token),
          ));
      }
    }
    comment.tags = [...updateTags].map((id: string) => new Types.ObjectId(id));

    let urls: string[] = [];

    if (req?.files?.length) {
      let path = "";
      // Update Comment
      if (comment.onModel === OnModelEnum.Post) {
        const post = await this._postRepo.findById({
          id: comment.refId as Types.ObjectId,
        });

        if (!post) {
          throw new AppError("Post Not Found !", 404);
        }
        path =
          `users/${req.user._id}` +
          `/posts/${post?.folderId}` +
          `/comments/${comment.folderId}`;
      }

      // Update Reply
      if (comment.onModel === OnModelEnum.Comment) {
        const parentComment = await this._commentRepo.findById({
          id: comment.refId as Types.ObjectId,
        });

        if (!parentComment) {
          throw new AppError("Comment Not Found !", 404);
        }
        const post = await this._postRepo.findById({
          id: parentComment.refId as Types.ObjectId,
        });

        if (!post) {
          throw new AppError("Post Not Found !", 404);
        }

        path =
          `users/${req.user._id}` +
          `/posts/${post?.folderId}` +
          `/comments/${parentComment?.folderId}` +
          `/replies/${comment.folderId}`;
      }

      urls = await this._s3Service.uploadFiles({
        files: req.files as Express.Multer.File[],
        path,
        store_type: StoreEnum.memory,
      });

      comment.attachments?.push(...urls);
    }

    if (FCMTokens.length) {
      await this._notificationService.sendNotifications({
        tokens: FCMTokens,
        data: {
          title: `${req.user.firstName} ${req.user.lastName} Update The Post`,
          body: content || "Update",
        },
      });
    }

    if (content) comment.content = content;

    await comment.save();
    if (removeAttachments?.length) {
      await this._s3Service.deleteFiles(removeAttachments);
    }
    successResponse({
      res,
      message: "Comment Updated Successfully !",
      status: 200,
      data: comment,
    });
  };

  reactComment = async (req: Request, res: Response, next: NextFunction) => {
    const {commentId} = req.params;
    const {reactType}: reactPostDTO = req.body;

    const comment = await this._commentRepo.findOne({
      filter: {
        _id: commentId,
        isDeleted: false,
      },
    });

    if (!comment) {
      throw new AppError("comment Not Found Or You Are Not Authorized !", 404);
    }
    // let updateQuery: any = {
    //   $addToSet: {reacts : {
    //     userId : req.user._id,
    //     reactType
    //   }},
    // };

    if (comment?.onModel === OnModelEnum.Post) {
      const post = await this._postRepo.findById({
        id: comment.refId as Types.ObjectId,
      });

      if (!post) {
        throw new AppError("Post Not Found !", 404);
      }
    } else if (comment?.onModel === OnModelEnum.Comment) {
      const parentComment = await this._commentRepo.findOne({
        filter: {
          _id: comment.refId,
          isDeleted: false,
        },
      });
      if (!parentComment) {
        throw new AppError("Comment Not Found !", 404);
      }

      const post = await this._postRepo.findById({
        id: parentComment.refId as Types.ObjectId,
      });

      if (!post) {
        throw new AppError("Post Not Found !", 404);
      }
    }

    const checkReactExist = comment.reacts?.find(
      (react) => react.userId.toString() === req.user._id.toString(),
    );

    // Remove React
    if (checkReactExist && checkReactExist.reactType === reactType) {
      await this._commentRepo.findOneAndUpdate({
        filter: {
          _id: comment._id,
        },
        update: {
          $pull: {
            reacts: {
              userId: req.user._id,
            },
          },
        },
      });
      return successResponse({
        res,
        message: `Reaction (${reactType}) Removed Successfully`,
        data: reactType,
      });
    }

    // Update React
    if (checkReactExist) {
      await this._commentRepo.findOneAndUpdate({
        filter: {
          _id: comment._id,
          "reacts.userId": req.user._id,
        },
        update: {
          $set: {
            "reacts.$.reactType": reactType,
          },
        },
      });
      return successResponse({
        res,
        message: `Reaction Updated To (${reactType}) Successfully`,
        data: reactType,
      });
    }

    // Add React
    await this._commentRepo.findOneAndUpdate({
      filter: {
        _id: comment._id,
      },
      update: {
        $addToSet: {
          reacts: {
            userId: req.user._id,
            reactType,
          },
        },
      },
    });

    if (comment.createdBy.toString() !== req?.user?._id.toString()) {
      await this._notificationRepo.create({
        data: {
          senderId: req.user._id,
          receiverId: comment.createdBy,
          body: reactType,
          type: NotificationTypeEnum.react,
          title:
            `${req.user.firstName} ` +
            `${req.user.lastName} reacted to your comment`,
          commentId: comment._id,
        },
      });

      const FCMTokens = await this._redisService.getFCMs(
        comment.createdBy as Types.ObjectId,
      );

      if (FCMTokens.length) {
        await this._notificationService.sendNotifications({
          tokens: FCMTokens,

          data: {
            title:
              `${req.user.firstName} ` +
              `${req.user.lastName} reacted to your comment`,

            body: reactType,
          },
        });
      }
    }

    successResponse({
      res,
      message: `Reaction (${reactType}) Added Successfully`,
      data: reactType,
    });
  };
}

export default new CommentService();
