import type {NextFunction, Request, Response} from "express";
import {IncomingHttpHeaders} from "node:http";
import {AppError} from "../utils/global-error-handling";
import tokenService from "../utils/services/token.service";
import {
  ACCESS_SECRET_KEY_ADMIN,
  ACCESS_SECRET_KEY_USER,
  PREFIX_ADMIN,
  PREFIX_USER,
} from "../../config/config.service";
import {JwtPayload} from "jsonwebtoken";
import UserRepository from "../../DB/repositories/user.repository";
import redisService from "../utils/services/redis.service";
import {checkTokenAndVerify} from "../utils/authentication.utils";
const _userModel = new UserRepository();

export const authentication = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const {authorization}: IncomingHttpHeaders = req.headers;
  const {user, verify} = await checkTokenAndVerify(authorization);
  req.user = user;
  req.verify = verify;

  next();
};

export const authentication_gql = async (authorization: string) => {
  return await checkTokenAndVerify(authorization);
};
