import {IncomingHttpHeaders} from "node:http";
import {JwtPayload} from "jsonwebtoken";
import {AppError} from "../utils/global-error-handling";
import tokenService from "../utils/services/token.service";
import redisService from "../utils/services/redis.service";
import UserRepository from "../../DB/repositories/user.repository";
import {
  ACCESS_SECRET_KEY_ADMIN,
  ACCESS_SECRET_KEY_USER,
  PREFIX_ADMIN,
  PREFIX_USER,
} from "../../config/config.service";

const _userModel = new UserRepository();

export const checkTokenAndVerify = async (authorization?: string) => {
  if (!authorization) {
    throw new AppError("Token Is Required ❗", 400);
  }

  const [prefix, token] = authorization.split(" ");

  if (!token) {
    throw new AppError("Token Is Required ❗", 400);
  }

  let ACCESS_SECRET_KEY = "";

  if (prefix === PREFIX_USER) {
    ACCESS_SECRET_KEY = ACCESS_SECRET_KEY_USER!;
  } else if (prefix === PREFIX_ADMIN) {
    ACCESS_SECRET_KEY = ACCESS_SECRET_KEY_ADMIN!;
  } else {
    throw new AppError("Invalid Prefix", 400);
  }

  const verify = tokenService.VerifyToken({
    token,
    secretKey: ACCESS_SECRET_KEY,
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
