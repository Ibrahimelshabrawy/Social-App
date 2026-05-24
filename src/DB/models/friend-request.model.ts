import mongoose, {Schema, Types} from "mongoose";
import {FriendRequestStatusEnum} from "../../common/enum/user.enum";

export interface IFriendRequest {
  senderId: Types.ObjectId;
  receiverId: Types.ObjectId;
  status: FriendRequestStatusEnum;
}

const FriendRequestSchema = new Schema<IFriendRequest>(
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

    status: {
      type: String,
      enum: FriendRequestStatusEnum,
      default: FriendRequestStatusEnum.pending,
    },
  },

  {
    timestamps: true,
  },
);

FriendRequestSchema.index(
  {
    senderId: 1,
    receiverId: 1,
  },
  {
    unique: true,
  },
);

const FriendRequestModel =
  mongoose.models.FriendRequest ||
  mongoose.model<IFriendRequest>("FriendRequest", FriendRequestSchema);

export default FriendRequestModel;
