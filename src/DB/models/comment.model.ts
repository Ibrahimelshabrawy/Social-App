import mongoose, {Schema, Types} from "mongoose";
import {OnModelEnum, ReactEnum} from "../../common/enum/post.enum";
import {S3Service} from "../../common/utils/services/s3.service";
import {AppError} from "../../common/utils/global-error-handling";
import {Query} from "mongoose";

export interface IComment {
  content?: string;
  attachments?: string[];

  createdBy: Types.ObjectId;
  tags?: Types.ObjectId[];
  reacts?: {
    userId: Types.ObjectId;
    reactType: ReactEnum;
  }[];
  refId: Types.ObjectId;
  onModel: OnModelEnum;
  folderId: string;
  isDeleted?: boolean;
  deletedAt?: Date | undefined;
  deletedBy: Types.ObjectId | undefined;
}

const CommentSchema = new Schema<IComment>(
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
    reacts: [
      {
        userId: {
          type: Types.ObjectId,
          ref: "User",
          required: true,
        },
        reactType: {
          type: String,
          enum: ReactEnum,
          required: true,
        },
      },
    ],

    refId: {
      type: Types.ObjectId,
      refPath: "onModel",
      required: true,
    },

    onModel: {
      type: String,
      enum: OnModelEnum,
      required: true,
    },

    folderId: String,
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: Date,
    deletedBy: {
      type: Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    strict: true,
    strictQuery: true,
    toJSON: {virtuals: true},
    toObject: {virtuals: true},
  },
);

CommentSchema.virtual("replies", {
  ref: "Comment",
  localField: "_id",
  foreignField: "refId",
});

const s3Service = new S3Service();

CommentSchema.pre("deleteOne", {document: true}, async function () {
  const replies = await mongoose.models.Comment?.find({
    refId: this._id,
    onModel: OnModelEnum.Comment,
  });
  if (!replies) {
    throw new AppError("No Replies Exist", 400);
  }
  for (const reply of replies) {
    await reply.deleteOne();
  }

  if (this?.attachments?.length) {
    await s3Service.deleteFiles(this.attachments);
  }
});

const CommentModel =
  mongoose.models.Comment || mongoose.model<IComment>("Comment", CommentSchema);

export default CommentModel;
