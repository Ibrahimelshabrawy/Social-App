import type {NextFunction, Request, Response} from "express";
import {RoleEnum} from "../enum/user.enum";
import {AppError} from "../utils/global-error-handling";
import {GraphQLError} from "graphql";

export const authorization = (roles: RoleEnum) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.role || !roles.includes(req.user.role)) {
      throw new AppError("You are not an authorized", 401);
    }
    next();
  };
};

export const authorization_gql = (roles: RoleEnum, role: string) => {
  if (!role || !roles.includes(role)) {
    throw new GraphQLError("You are not an authorized", {
      extensions: {
        code: "FORBIDDEN",
        status: 403,
        message: "You Don't Have The Permission To Access This Action",
      },
    });
  }
};
