import mongoose, {Schema, Types} from "mongoose";
import {NotificationTypeEnum} from "../../common/enum/notification.enum";

export interface INotification {
  senderId: Types.ObjectId;
  receiverId: Types.ObjectId;
  title: string;
  body: string;
  type: NotificationTypeEnum;
  postId?: Types.ObjectId;
  commentId?: Types.ObjectId;
  isRead?: boolean;
}
const NotificationSchema = new Schema<INotification>(
  {
    senderId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },

    receiverId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: {
      type: String,
      required: true,
    },

    body: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      enum: NotificationTypeEnum,
      required: true,
    },

    postId: {
      type: Types.ObjectId,
      ref: "Post",
    },

    commentId: {
      type: Types.ObjectId,
      ref: "Comment",
    },

    isRead: {
      type: Boolean,
      default: false,
    },
  },

  {
    timestamps: true,
  },
);

const NotificationModel =
  mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema);

export default NotificationModel;
