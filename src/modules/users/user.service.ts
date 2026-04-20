import type {NextFunction, Request, Response} from "express";
import {successResponse} from "../../common/utils/response.success";

class UserService {
  constructor() {}

  getProfile = (req: Request, res: Response, next: NextFunction) => {
    successResponse({
      res,
      message: "User Profile Is Here 🥳",
      data: req.user,
    });
  };
}

export default new UserService();
