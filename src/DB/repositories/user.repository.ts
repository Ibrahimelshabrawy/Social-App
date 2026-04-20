import {Model, Types} from "mongoose";
import userModel, {IUser} from "../models/user.model";
import BaseRepository from "./base.repository";
import {AppError} from "../../common/utils/global-error-handling";

class UserRepository extends BaseRepository<IUser> {
  constructor(protected readonly model: Model<IUser> = userModel) {
    super(model);
  }

  async checkEmailExist(email: string) {
    const emailExist = await this.findOne({
      filter: {email},
    });
    if (emailExist) {
      throw new AppError("Email Already Exist ", 409);
    }
    return true;
  }

  async checkUserExistByEmail(email: string) {
    const user = await this.findOne({
      filter: {email},
    });
    if (!user) {
      throw new AppError("User Not Exist 😔", 404);
    }
    return user;
  }

  async checkUserExistById(id: Types.ObjectId) {
    const user = await this.findById({
      id,
    });
    if (!user) {
      throw new AppError("User Not Exist 😔", 404);
    }
    return user;
  }
}

export default UserRepository;
