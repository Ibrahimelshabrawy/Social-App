import mongoose, {Schema, Types} from "mongoose";
import {AllowCommentEnum, AvailabilityEnum} from "../../common/enum/post.enum";

export interface IPost {
  content?: string;
  attachments?: string[];

  createdBy: Types.ObjectId;
  tags?: Types.ObjectId[];
  likes?: Types.ObjectId[];

  allowComments?: AllowCommentEnum;
  availability?: AvailabilityEnum;

  folderId: string;
}

const PostSchema = new Schema<IPost>(
  {
    content: {
      type: String,
      min: 1,
      required: function (this) {
        return !this.attachments?.length;
      },
    },
    attachments: [String],
    createdBy: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },

    tags: {
      type: [Types.ObjectId],
      ref: "User",
    },
    likes: {
      type: [Types.ObjectId],
      ref: "User",
    },

    allowComments: {
      type: String,
      enum: AllowCommentEnum,
      default: AllowCommentEnum.allow,
    },
    availability: {
      type: String,
      enum: AvailabilityEnum,
      default: AvailabilityEnum.public,
    },

    folderId: String,
  },
  {
    timestamps: true,
    strict: true,
    strictQuery: true,
    toJSON: {virtuals: true},
    toObject: {virtuals: true},
  },
);

const PostModel =
  mongoose.models.Post || mongoose.model<IPost>("Post", PostSchema);

export default PostModel;
