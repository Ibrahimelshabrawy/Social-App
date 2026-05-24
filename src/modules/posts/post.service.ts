import type {NextFunction, Request, Response} from "express";
import {successResponse} from "../../common/utils/response.success";
import {CreatePostDTO, reactPostDTO, updatePostDTO} from "./post.dto";
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
import {AvailabilityEnum, OnModelEnum} from "../../common/enum/post.enum";
import {AvailabilityPost} from "../../common/utils/posts.utils";
import CommentRepository from "../../DB/repositories/comment.repository";
import notificationRepository from "../../DB/repositories/notification.repository";
import {NotificationTypeEnum} from "../../common/enum/notification.enum";

class PostService {
  private readonly _postRepo = new PostRepository();
  private readonly _userRepo = new UserRepository();
  private readonly _commentRepo = new CommentRepository();
  private readonly _redisService = redisService;
  private readonly _notificationService = notificationService;
  private readonly _notificationRepo = notificationRepository;

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
        if (mention._id.toString() == req?.user?._id.toString()) {
          throw new AppError("You Cannot Mention Yourself", 400);
        }
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
    let search = req.query.search
      ? {
          $or: [{content: {$regex: req.query?.search, $options: "i"}}],
        }
      : {};
    const posts = await this._postRepo.paginate({
      page: +req.query.page!,
      limit: +req.query.limit!,
      search: {
        $and: [
          {
            $or: AvailabilityPost(req),
          },
          {
            isDeleted: false,
          },
          search,
        ],
      },
      populate: [
        {
          path: "comments",
          match: {
            commentId: {$exists: false},
          },
          populate: [
            {
              path: "replies",
            },
          ],
        },
      ],
    });

    successResponse({
      res,
      data: posts,
    });
  };

  updatePost = async (req: Request, res: Response, next: NextFunction) => {
    let {
      allowComments,
      availability,
      attachments,
      content,
      tags,
      removeAttachments,
      removeTags,
    }: updatePostDTO = req.body;

    const {postId} = req.params;

    const post = await this._postRepo.findOne({
      filter: {
        _id: postId,
        createdBy: req?.user?._id!,
        isDeleted: false,
      },
    });

    if (!post) {
      throw new AppError("Post Not Found !", 404);
    }

    let FCMTokens: string[] = [];

    if (removeAttachments?.length) {
      const inValidAttachments = removeAttachments.filter((attachment) => {
        return !post?.attachments?.includes(attachment);
      });

      inValidAttachments;

      if (inValidAttachments?.length) {
        throw new AppError("There Is An Attachment Than Not Exist", 404);
      }

      await this._s3Service.deleteFiles(removeAttachments);
      post.attachments = post?.attachments?.filter((attachment) => {
        return !removeAttachments.includes(attachment);
      }) as string[];
    }

    const updateTags = new Set(post?.tags?.map((id) => id.toString()));

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
    post.tags = [...updateTags].map((id: string) => new Types.ObjectId(id));

    if (req?.files) {
      let urls = await this._s3Service.uploadFiles({
        files: req.files as Express.Multer.File[],
        path: `users/${req.user._id}/posts/${post.folderId}`,
        store_type: StoreEnum.memory,
      });
      post.attachments?.push(...urls);
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

    if (content) post.content = content;
    if (availability) post.availability = availability;
    if (allowComments) post.allowComments = allowComments;

    await post.save();
    successResponse({
      res,
      message: "Post Created Successfully !",
      status: 201,
      data: post,
    });
  };

  getPost = async (req: Request, res: Response, next: NextFunction) => {
    const {postId} = req.params;

    const post = await this._postRepo.findOne({
      filter: {
        _id: postId,
        $or: AvailabilityPost(req),
        isDeleted: false,
      },
      options: {
        populate: [
          {
            path: "comments",
            match: {
              commentId: {$exists: false},
            },
            populate: [
              {
                path: "replies",
              },
            ],
          },
        ],
      },
    });

    if (!post) {
      throw new AppError("Post Not Found !", 404);
    }

    successResponse({
      res,
      message: "Post Fetched Successfully !",
      status: 200,
      data: post,
    });
  };

  deletePost = async (req: Request, res: Response, next: NextFunction) => {
    const {postId} = req.params;

    const post = await this._postRepo.findById({
      id: postId as unknown as Types.ObjectId,
    });

    if (!post) {
      throw new AppError("Post Not Found !", 404);
    }
    if (!post.createdBy.equals(req?.user?._id!)) {
      throw new AppError("You Are Not Authorized To Delete This Post !", 403);
    }

    await this._postRepo.findByIdAndDelete({
      id: postId as unknown as Types.ObjectId,
    });

    // await this._postRepo.fin

    successResponse({
      res,
      message: "Post Deleted Successfully !",
      status: 200,
    });
  };

  softDeletePost = async (req: Request, res: Response, next: NextFunction) => {
    const {postId} = req.params;

    const post = await this._postRepo.findOne({
      filter: {
        id: postId as unknown as Types.ObjectId,
        isDeleted: false,
      },
    });

    if (!post || post.isDeleted) {
      throw new AppError("Post Not Found !", 404);
    }
    if (!post.createdBy.equals(req?.user?._id!)) {
      throw new AppError("You Are Not Authorized To Delete This Post !", 403);
    }

    const comments = await this._commentRepo.find({
      filter: {
        refId: post._id,
        isDeleted: false,
        onModel: OnModelEnum.Post,
      },
      projection: {
        _id: 1,
      },
    });

    const commentsIds = comments.map((comment) => comment._id);

    // Soft Delete Replies
    await this._commentRepo.updateMany({
      filter: {
        refId: {
          $in: commentsIds,
        },
        onModel: OnModelEnum.Comment,
        isDeleted: false,
      },
      update: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: req.user._id,
      },
    });

    // Soft Delete Comments
    await this._commentRepo.updateMany({
      filter: {
        refId: post._id,
        onModel: OnModelEnum.Post,
        isDeleted: false,
      },
      update: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: req.user._id,
      },
    });

    post.isDeleted = true;
    post.deletedAt = new Date();
    post.deletedBy = req.user._id;

    await post.save();

    successResponse({
      res,
      message: "Post Soft Deleted Successfully !",
      status: 200,
    });
  };

  restorePost = async (req: Request, res: Response, next: NextFunction) => {
    const {postId} = req.params;

    const post = await this._postRepo.findOne({
      filter: {
        id: postId as unknown as Types.ObjectId,
        isDeleted: true,
      },
    });

    if (!post) {
      throw new AppError("Post Not Found !", 404);
    }
    if (!post.createdBy.equals(req?.user?._id!)) {
      throw new AppError("You Are Not Authorized To Delete This Post !", 403);
    }

    const comments = await this._commentRepo.find({
      filter: {
        refId: post._id,
        isDeleted: true,
        onModel: OnModelEnum.Post,
      },
      projection: {
        _id: 1,
      },
    });

    const commentsIds = comments.map((comment) => comment._id);

    // Soft Delete Replies
    await this._commentRepo.updateMany({
      filter: {
        refId: {
          $in: commentsIds,
        },
        onModel: OnModelEnum.Comment,
        isDeleted: true,
      },
      update: {
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
      },
    });

    // Soft Delete Comments
    await this._commentRepo.updateMany({
      filter: {
        refId: post._id,
        onModel: OnModelEnum.Post,
        isDeleted: true,
      },
      update: {
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
      },
    });

    post.isDeleted = false;
    post.deletedAt = undefined;
    post.deletedBy = undefined;

    await post.save();

    successResponse({
      res,
      message: "Post Soft Deleted Successfully !",
      status: 200,
    });
  };

  savePost = async (req: Request, res: Response, next: NextFunction) => {
    const {postId} = req.params;

    const post = await this._postRepo.findOne({
      filter: {
        id: postId as unknown as Types.ObjectId,
        isDeleted: false,
      },
    });

    if (!post) {
      throw new AppError("Post Not Found !", 404);
    }

    const user = await this._userRepo.findById({
      id: req.user._id,
    });

    if (!user) {
      throw new AppError("User Not Found !", 404);
    }
    // some => FIND FIRST ONE THAT MATCH CONDITION AND RETURN ( TRUE / FALSE ) , LIKE FIND METHOD BUT FIND RETURN (OBJECT)
    const isSaved = user.savedPosts?.some((id) => id.toString() === postId);
    let message = "";
    if (isSaved) {
      await this._userRepo.findOneAndUpdate({
        filter: {
          _id: req?.user?._id,
        },
        update: {
          $pull: {
            savedPosts: postId,
          },
        },
      });
      message = "Post Unsaved Successfully";
    } else {
      await this._userRepo.findOneAndUpdate({
        filter: {
          _id: req?.user?._id,
        },
        update: {
          $addToSet: {
            savedPosts: postId,
          },
        },
      });
      message = "Post Saved Successfully";
    }

    successResponse({
      res,
      message,
      status: 200,
    });
  };

  getNewsFeed = async (req: Request, res: Response, next: NextFunction) => {
    const {page, limit, search} = req.query;

    let searchQuery = {};
    if (search) {
      searchQuery = {
        content: {
          $regex: search,
          $options: "i",
        },
      };
    }

    const posts = await this._postRepo.paginate({
      page: +page!,
      limit: +limit!,

      search: {
        $and: [
          {
            $or: AvailabilityPost(req),
          },
          {
            isDeleted: false,
          },

          searchQuery,
        ],
      },

      // Latest Posts First
      sort: {
        createdAt: -1,
      },

      populate: [
        // Post Owner
        {
          path: "createdBy",
          select: "firstName lastName profilePic",
        },

        // Tagged Users
        {
          path: "tags",
          select: "firstName lastName profilePic",
        },

        // Comments Preview
        {
          path: "comments",
          match: {
            isDeleted: false,
          },
          options: {
            sort: {
              createdAt: -1,
            },

            limit: 2,
          },

          populate: [
            // Comment Owner
            {
              path: "createdBy",
              select: "firstName lastName profilePic",
            },

            // Replies Preview
            {
              path: "replies",
              match: {
                isDeleted: false,
              },

              options: {
                sort: {
                  createdAt: -1,
                },

                limit: 1,
              },

              populate: [
                {
                  path: "createdBy",
                  select: "firstName lastName profilePic",
                },
              ],
            },
          ],
        },
      ],
    });

    successResponse({
      res,
      message: "News Feed Is Here 🥳",
      data: posts,
    });
  };

  reactPost = async (req: Request, res: Response, next: NextFunction) => {
    const {postId} = req.params;

    const {reactType}: reactPostDTO = req.body;

    const post = await this._postRepo.findOne({
      filter: {
        _id: postId,
        isDeleted: false,
      },
    });

    if (!post) {
      throw new AppError("Post Not Found !", 404);
    }

    const checkReactExist = post.reacts?.find(
      (react) => react.userId.toString() === req.user._id.toString(),
    );

    // Remove React
    if (checkReactExist && checkReactExist.reactType === reactType) {
      await this._postRepo.findOneAndUpdate({
        filter: {
          _id: post._id,
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
      await this._postRepo.findOneAndUpdate({
        filter: {
          _id: post._id,
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
    await this._postRepo.findOneAndUpdate({
      filter: {
        _id: post._id,
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

    if (post.createdBy.toString() !== req?.user?._id.toString()) {
      await this._notificationRepo.create({
        data: {
          senderId: req.user._id,
          receiverId: post.createdBy,
          body: reactType,
          type: NotificationTypeEnum.react,
          title:
            `${req.user.firstName} ` +
            `${req.user.lastName} reacted to your post`,
          postId: post._id,
        },
      });

      const FCMTokens = await this._redisService.getFCMs(
        post.createdBy as Types.ObjectId,
      );

      if (FCMTokens.length) {
        await this._notificationService.sendNotifications({
          tokens: FCMTokens,

          data: {
            title:
              `${req.user.firstName} ` +
              `${req.user.lastName} reacted to your post`,

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

export default new PostService();
