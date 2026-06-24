import mongoose, {Schema, Types} from "mongoose";
import {GenderEnum, ProviderEnum, RoleEnum} from "../../common/enum/user.enum";

interface IMessage {
  createdBy: Types.ObjectId;
  content: string;
}

export interface IChat {
  // One Vers One
  createdBy: Types.ObjectId;
  participants: Types.ObjectId[];
  messages: IMessage[];

  // One Vers Many
  group: string;
  groupImage: string;
  roomId: string;
}

const MessageSchema = new Schema<IMessage>(
  {
    createdBy: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    strictQuery: true,
    toJSON: {virtuals: true},
    toObject: {virtuals: true},
  },
);
const ChatSchema = new Schema<IChat>(
  {
    createdBy: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    participants: {
      type: [Types.ObjectId],
      ref: "User",
      required: true,
    },
    messages: [MessageSchema],

    group: String,
    groupImage: String,
    roomId: String,
  },
  {
    timestamps: true,
    strictQuery: true,
    toJSON: {virtuals: true},
    toObject: {virtuals: true},
  },
);

const ChatModel =
  mongoose.models.Chat || mongoose.model<IChat>("Chat", ChatSchema);

export default ChatModel;
