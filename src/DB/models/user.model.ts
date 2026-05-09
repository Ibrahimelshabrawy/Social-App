import mongoose, {Schema, Types} from "mongoose";
import {GenderEnum, ProviderEnum, RoleEnum} from "../../common/enum/user.enum";

export interface IUser {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  age: number;
  email: string;
  password: string;
  phone?: string;
  address?: string;
  profilePicture?: string;
  gender?: GenderEnum;
  provider?: ProviderEnum;
  role?: RoleEnum;
  confirmed?: Boolean;
  friends?: Types.ObjectId[];

  changeCredential: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: function (): boolean {
        return this.provider == ProviderEnum.local ? true : false;
      },
      trim: true,
      unique: true,
    },
    password: {
      type: String,
      required: function (): boolean {
        return this.provider == ProviderEnum.local ? true : false;
      },
      trim: true,
      min: 3,
      max: 25,
    },
    role: {
      type: String,
      enum: RoleEnum,
      default: RoleEnum.user,
    },
    provider: {
      type: String,
      enum: ProviderEnum,
      default: ProviderEnum.local,
    },
    gender: {
      type: String,
      enum: GenderEnum,
      default: GenderEnum.male,
    },
    friends: {
      type: [Types.ObjectId],
      ref: "User",
    },
    confirmed: Boolean,
    changeCredential: Date,
    age: Number,
    phone: String,
    profilePicture: String,
  },
  {
    timestamps: true,
    strict: true,
    strictQuery: true,
    toJSON: {virtuals: true},
    toObject: {virtuals: true},
  },
);

userSchema.virtual("userName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

const userModel =
  mongoose.models.User || mongoose.model<IUser>("User", userSchema);

export default userModel;
