import type {NextFunction, Request, Response} from "express";
import {RoleEnum} from "../enum/user.enum";
import {AppError} from "../utils/global-error-handling";

export const authorization = (roles: RoleEnum) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.role || !roles.includes(req.user.role)) {
      throw new AppError("You are not an authorized", 401);
    }
    next();
  };
};
