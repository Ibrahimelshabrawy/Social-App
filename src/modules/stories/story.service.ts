import type {NextFunction, Request, Response} from "express";
import {successResponse} from "../../common/utils/response.success";
import PostRepository from "../../DB/repositories/post.repository";
import {AppError} from "../../common/utils/global-error-handling";
import {Types} from "mongoose";
import redisService from "../../common/utils/services/redis.service";
import {S3Service} from "../../common/utils/services/s3.service";
import {randomUUID} from "node:crypto";
import {StoreEnum} from "../../common/enum/multer.enum";
import notificationService from "../../common/utils/services/notification.service";
import UserRepository from "../../DB/repositories/user.repository";
import CommentRepository from "../../DB/repositories/comment.repository";
import notificationRepository from "../../DB/repositories/notification.repository";
import {NotificationTypeEnum} from "../../common/enum/notification.enum";
import StoryRepository from "../../DB/repositories/story.repository";
import {CreateStoryDTO} from "./story.dto";
import {IStory} from "../../DB/models/story.model";

class StoryService {
  private readonly _postRepo = new PostRepository();
  private readonly _userRepo = new UserRepository();
  private readonly _storyRepo = new StoryRepository();
  private readonly _commentRepo = new CommentRepository();
  private readonly _redisService = redisService;
  private readonly _notificationService = notificationService;
  private readonly _notificationRepo = notificationRepository;

  private readonly _s3Service = new S3Service();

  constructor() {}

  createStory = async (req: Request, res: Response, next: NextFunction) => {
    const {caption, tags}: CreateStoryDTO = req.body;

    let mentions: Types.ObjectId[] = [];
    let FCMTokens: string[] = [];

    if (tags?.length) {
      const mentionedUsers = await this._userRepo.find({
        filter: {
          _id: {
            $in: tags,
          },
        },
      });

      if (mentionedUsers.length !== tags.length) {
        throw new AppError("Invalid Tag ID !", 404);
      }

      for (const mention of mentionedUsers) {
        if (mention._id.toString() === req.user._id.toString()) {
          throw new AppError("You Cannot Mention Yourself !", 400);
        }
        mentions.push(mention._id);

        (await this._redisService.getFCMs(mention._id)).map((token) =>
          FCMTokens.push(token),
        );
      }
    }

    const folderId = randomUUID();

    const uploadedFiles = await this._s3Service.uploadFiles({
      files: req.files as Express.Multer.File[],
      path: `users/${req.user._id}` + `/stories/${folderId}`,
      store_type: StoreEnum.memory,
    });

    const story = await this._storyRepo.create({
      data: {
        attachments: uploadedFiles,
        caption,
        createdBy: req.user._id,
        folderId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        tags: mentions,
      } as Partial<IStory>,
    });

    if (!story) {
      await this._s3Service.deleteFiles(uploadedFiles);
      throw new AppError("Failed To Create Story !", 400);
    }

    if (mentions.length) {
      for (const mention of mentions) {
        await this._notificationRepo.create({
          data: {
            senderId: req.user._id,
            receiverId: mention._id,
            title:
              `${req.user.firstName} ` +
              `${req.user.lastName} mentioned you in a story`,
            body: caption || "Story Mention",
            type: NotificationTypeEnum.tag,
          },
        });
      }
    }

    if (FCMTokens) {
      await this._notificationService.sendNotifications({
        tokens: FCMTokens,
        data: {
          title:
            `${req.user.firstName} ` +
            `${req.user.lastName} mentioned you in a story`,

          body: caption || "Story Mention",
        },
      });
    }

    successResponse({
      res,
      message: "Story Created Successfully 🥳",
      status: 201,
      data: story,
    });
  };

  getStoriesFeed = async (req: Request, res: Response, next: NextFunction) => {
    const stories = await this._storyRepo.getStoriesFeed(req);

    successResponse({
      res,
      message: "Stories Feed Is Here 🥳",
      data: stories,
    });
  };

  viewStory = async (req: Request, res: Response, next: NextFunction) => {
    const {storyId} = req.params;

    const story = await this._storyRepo.findOne({
      filter: {
        _id: storyId,
        expiresAt: {
          $gt: new Date(),
        },
      },
    });

    if (!story) {
      throw new AppError("Story Not Found !", 404);
    }

    if (story.createdBy.toString() === req.user._id.toString()) {
      return successResponse({
        res,
        message: "Your Own Story 😎",
      });
    }

    await this._storyRepo.findOneAndUpdate({
      filter: {
        _id: story._id,
      },
      update: {
        $addToSet: {
          viewers: req.user._id,
        },
      },
    });

    successResponse({
      res,
      message: "Story Viewed Successfully 👀",
    });
  };

  getStoryViewers = async (req: Request, res: Response, next: NextFunction) => {
    const {storyId} = req.params;

    const story = await this._storyRepo.findOne({
      filter: {
        _id: storyId,
        expiresAt: {
          $gt: new Date(),
        },
      },
      options: {
        populate: [
          {
            path: "viewers",
            select: "firstName lastName profilePicture",
          },
        ],
      },
    });

    if (!story) {
      throw new AppError("Story Not Found !", 404);
    }

    if (story.createdBy.toString() !== req.user._id.toString()) {
      throw new AppError("You Are Not Authorized !", 403);
    }

    successResponse({
      res,
      message: "Story Viewers Is Here 👀",
      data: {
        viewersCount: story.viewers?.length || 0,
        viewers: story.viewers,
      },
    });
  };

  deleteStory = async (req: Request, res: Response, next: NextFunction) => {
    const {storyId} = req.params;

    const story = await this._storyRepo.findOne({
      filter: {
        _id: storyId,
        expiresAt: {
          $gt: new Date(),
        },
      },
    });

    if (!story) {
      throw new AppError("Story Not Found !", 404);
    }

    if (story.createdBy.toString() !== req.user._id.toString()) {
      throw new AppError("You Are Not Authorized !", 403);
    }

    if (story.attachments?.length) {
      await this._s3Service.deleteFiles(story.attachments);
    }
    await story.deleteOne();

    successResponse({
      res,
      message: "Story Deleted Successfully 🥳",
    });
  };
}

export default new StoryService();
