import {Request} from "express";
import StoryModel, {IStory} from "../../DB/models/story.model";
import BaseRepository from "./base.repository";
import {AvailabilityStory} from "../../common/utils/story.utils";

class StoryRepository extends BaseRepository<IStory> {
  constructor() {
    super(StoryModel);
  }

  async getStoriesFeed(req: Request) {
    return await this.model.aggregate([
      // Match Stories
      {
        $match: {
          expiresAt: {
            $gt: new Date(),
          },
          $or: AvailabilityStory(req),
        },
      },

      // =========================
      // Populate CreatedBy
      {
        $lookup: {
          from: "users",
          localField: "createdBy",
          foreignField: "_id",
          as: "createdBy",
        },
      },

      {
        $unwind: "$createdBy",
      },

      // =========================
      // Populate Tags
      {
        $lookup: {
          from: "users",
          localField: "tags",
          foreignField: "_id",
          as: "tags",
        },
      },

      // =========================
      // Seen / Unseen Stories
      {
        $addFields: {
          isSeen: {
            $in: [req.user._id, "$viewers"],
          },
        },
      },

      // =========================
      // Sort Stories
      {
        $sort: {
          isSeen: 1,
          createdAt: -1,
        },
      },

      // =========================
      // Group Stories By User
      {
        $group: {
          _id: "$createdBy._id",

          createdBy: {
            $first: {
              _id: "$createdBy._id",
              firstName: "$createdBy.firstName",
              lastName: "$createdBy.lastName",
              profilePicture: "$createdBy.profilePicture",
            },
          },

          stories: {
            $push: {
              _id: "$_id",
              attachments: "$attachments",
              caption: "$caption",
              tags: "$tags",
              viewers: "$viewers",
              isSeen: "$isSeen",
              expiresAt: "$expiresAt",
              createdAt: "$createdAt",
            },
          },
        },
      },

      // =========================
      // Final Sort Users
      {
        $sort: {
          "stories.0.isSeen": 1,
          "stories.0.createdAt": -1,
        },
      },
    ]);
  }
}

export default StoryRepository;
