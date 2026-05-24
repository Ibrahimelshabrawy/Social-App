import mongoose, {Schema, Types} from "mongoose";

export interface IStory {
  attachments: string[];
  caption?: string;
  createdBy: Types.ObjectId;
  viewers?: Types.ObjectId[];
  tags?: Types.ObjectId[];
  expiresAt: Date;
  folderId: string;
}

const StorySchema = new Schema<IStory>(
  {
    attachments: [
      {
        type: String,
        required: true,
      },
    ],

    caption: {
      type: String,
    },

    createdBy: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },

    tags: [
      {
        type: Types.ObjectId,
        ref: "User",
      },
    ],
    viewers: [
      {
        type: Types.ObjectId,
        ref: "User",
      },
    ],

    expiresAt: {
      type: Date,
      required: true,
    },

    folderId: {
      type: String,
      required: true,
    },
  },

  {
    timestamps: true,
  },
);

// MongoDB will automatically
// delete stories after expiresAt

StorySchema.index(
  {
    expiresAt: 1,
  },
  {
    expireAfterSeconds: 0,
  },
);

const StoryModel =
  mongoose.models.Story || mongoose.model<IStory>("Story", StorySchema);

export default StoryModel;
