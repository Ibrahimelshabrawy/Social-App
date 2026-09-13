import type {NextFunction, Request, Response} from "express";
import {IncomingHttpHeaders} from "node:http";
import {AppError} from "../utils/global-error-handling";
import tokenService from "../utils/services/token.service";
import {
  ACCESS_SECRET_KEY_ADMIN,
  ACCESS_SECRET_KEY_USER,
  PREFIX_ADMIN,
  PREFIX_USER,
  REFRESH_SECRET_KEY_ADMIN,
  REFRESH_SECRET_KEY_USER,
} from "../../config/config.service";
import {JwtPayload} from "jsonwebtoken";
import UserRepository from "../../DB/repositories/user.repository";
import redisService from "../utils/services/redis.service";
import {TokenEnum} from "../enum/token.enum";
const _userModel = new UserRepository();

export const getSignature = async (prefix: string) => {
  let ACCESS_SECRET_KEY = "";
  let REFRESH_SECRET_KEY = "";
  if (prefix === PREFIX_USER) {
    ACCESS_SECRET_KEY = ACCESS_SECRET_KEY_USER!;
    REFRESH_SECRET_KEY = REFRESH_SECRET_KEY_USER!;
  } else if (prefix === PREFIX_ADMIN) {
    ACCESS_SECRET_KEY = ACCESS_SECRET_KEY_ADMIN!;
    REFRESH_SECRET_KEY = REFRESH_SECRET_KEY_ADMIN!;
  } else {
    throw new AppError("Invalid Prefix", 400);
  }

  return {ACCESS_SECRET_KEY, REFRESH_SECRET_KEY};
};

export const fetchUserAndVerify = async (token: string, secretKey: string) => {
  const verify = tokenService.VerifyToken({
    token,
    secretKey,
  }) as JwtPayload;

  if (!verify || !verify._id) {
    throw new AppError("Invalid Token❗", 400);
  }

  const user = await _userModel.checkUserExistById(verify._id);

  if (!user) {
    throw new AppError("User Not Found", 404);
  }

  if (!user.confirmed) {
    throw new AppError("User Not Confirmed Yet", 400);
  }

  if (user.changeCredential?.getTime() > verify.iat! * 1000) {
    throw new AppError("Invalid Token session, Please Login Again", 403);
  }

  const revokeToken = await redisService.getValue(
    redisService.revokeKey({
      userId: verify._id,
      jti: verify.jti!,
    }),
  );

  if (revokeToken) {
    throw new AppError("Invalid Revoke Token For This Device", 403);
  }

  return {user, verify};
};

export const authentication = (
  tokenType: TokenEnum = TokenEnum.access_token,
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const {authorization} = req.headers;
    if (!authorization) {
      throw new AppError("Token Is Required ❗", 400);
    }

    const [prefix, token] = authorization.split(" ");

    if (!token) {
      throw new AppError("Token Is Required ❗", 400);
    }
    if (!prefix) {
      throw new AppError("Prefix Is Required ❗", 400);
    }
    const {ACCESS_SECRET_KEY, REFRESH_SECRET_KEY} = await getSignature(prefix);

    const secretKey =
      tokenType == TokenEnum.access_token
        ? ACCESS_SECRET_KEY
        : REFRESH_SECRET_KEY;

    const {user, verify} = await fetchUserAndVerify(token, secretKey);

    req.user = user;
    req.verify = verify;

    next();
  };
};

