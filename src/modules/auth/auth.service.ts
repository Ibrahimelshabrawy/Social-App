import type {NextFunction, Request, Response} from "express";
import UserRepository from "../../DB/repositories/user.repository";
import {AppError} from "../../common/utils/global-error-handling";
import {
  confirmEmailDto,
  SignInDto,
  SignUpDto,
  updatePasswordDto,
} from "./auth.dto";
import {HydratedDocument} from "mongoose";
import {IUser} from "../../DB/models/user.model";
import {encrypt} from "../../common/utils/security/encrypt.security";
import {compare_match, Hash} from "../../common/utils/security/hash";
import {generateOtp, sendEmail} from "../../common/utils/email/sendEmail";
import {eventEmitter} from "../../common/utils/email/email.event";
import {EventEnum} from "../../common/enum/event.enum";
import {emailTemplate} from "../../common/utils/email/email.template";
import {LogOutEnum, ProviderEnum, RoleEnum} from "../../common/enum/user.enum";
import {successResponse} from "../../common/utils/response.success";
import redisService from "../../common/utils/services/redis.service";
import tokenService from "../../common/utils/services/token.service";
import {
  ACCESS_SECRET_KEY_ADMIN,
  ACCESS_SECRET_KEY_USER,
  REFRESH_SECRET_KEY_ADMIN,
  REFRESH_SECRET_KEY_USER,
  WEB_CLIENT_ID,
} from "../../config/config.service";
import {randomUUID} from "node:crypto";
import {OAuth2Client, TokenPayload} from "google-auth-library";
class AuthService {
  private readonly _userModel = new UserRepository();
  private readonly redisService = redisService;
  private readonly tokenService = tokenService;

  constructor() {}

  signup = async (req: Request, res: Response, next: NextFunction) => {
    let {
      firstName,
      lastName,
      email,
      password,
      cPassword,
      address,
      age,
      gender,
      phone,
      role,
    }: SignUpDto = req.body;

    await this._userModel.checkEmailExist(email);

    const otp = await generateOtp();
    const otpTTL = 60;
    const expireAt = new Date(Date.now() + otpTTL * 1000);

    const formattedExpireTime = expireAt.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    eventEmitter.emit(EventEnum.confirmEmail, async () => {
      await sendEmail({
        to: email,
        subject: "Welcome To Social Media App",
        html: emailTemplate({
          otp,
          subject: EventEnum.confirmEmail,
          expireAt: formattedExpireTime,
        }),
      });

      await redisService.setValue({
        key: redisService.otpKey({email, subject: EventEnum.confirmEmail}),
        value: Hash({plainText: `${otp}`}),
        ttl: 60,
      });

      await redisService.setValue({
        key: redisService.maxOtpKey({email, subject: EventEnum.confirmEmail}),
        value: "1",
        ttl: 60 * 3,
      });
    });

    const user: HydratedDocument<IUser> = await this._userModel.create({
      data: {
        firstName,
        lastName,
        email,
        password: Hash({plainText: password}),
        address,
        age,
        gender,
        phone: phone ? encrypt(phone) : null,
        role,
      } as Partial<IUser>,
    });

    successResponse({
      res,
      status: 201,
      message: "Sign Up Successfully 🥳🥳",
      data: user,
    });
  };

  confirmEmail = async (req: Request, res: Response, next: NextFunction) => {
    const {email, otp}: confirmEmailDto = req.body;

    await this._userModel.checkUserExistByEmail(email);

    const otpValue = await redisService.getValue(
      redisService.otpKey({email, subject: EventEnum.confirmEmail}),
    );

    if (!otpValue) {
      throw new AppError("OTP Expired 😔", 404);
    }

    if (
      !compare_match({
        plainText: otp,
        cipherText: otpValue,
      })
    ) {
      throw new AppError("OTP Not Correct 😔", 400);
    }

    await this._userModel.findOneAndUpdate({
      filter: {
        email,
        confirmed: {$exists: false},
        provider: ProviderEnum.local,
      },
      update: {confirmed: true},
    });

    redisService.deleteKey(
      redisService.otpKey({email, subject: EventEnum.confirmEmail}),
    );

    successResponse({
      res,
      status: 200,
      message: "Confirm Email Successfully 🥳🥳",
    });
  };

  signIn = async (req: Request, res: Response, next: NextFunction) => {
    const {email, password}: SignInDto = req.body;

    const user = await this._userModel.checkUserExistByEmail(email);
    if (!user.confirmed) {
      throw new AppError("You Are Not Confirmed", 400);
    }
    if (
      !compare_match({
        plainText: password,
        cipherText: user.password,
      })
    ) {
      throw new AppError("Password Is Not Correct", 400);
    }

    const uuid = randomUUID();

    const access_token = tokenService.GenerateToken({
      payload: {_id: user.id},
      secretKey:
        user?.role == RoleEnum.user
          ? ACCESS_SECRET_KEY_USER!
          : ACCESS_SECRET_KEY_ADMIN!,
      options: {
        expiresIn: "1h",
        jwtid: uuid,
      },
    });

    const refresh_token = tokenService.GenerateToken({
      payload: {_id: user.id},
      secretKey:
        user?.role == RoleEnum.user
          ? REFRESH_SECRET_KEY_USER!
          : REFRESH_SECRET_KEY_ADMIN!,
      options: {
        expiresIn: "1y",
        jwtid: uuid,
      },
    });

    successResponse({
      res,
      status: 200,
      message: "Sign In Successfully 🥳🥳",
      data: {
        access_token,
        refresh_token,
      },
    });
  };

  updatePassword = async (req: Request, res: Response, next: NextFunction) => {
    const {oldPassword, newPassword}: updatePasswordDto = req.body;

    await this._userModel.checkUserExistById(req.user._id);
    if (
      !compare_match({
        plainText: oldPassword,
        cipherText: req.user.password,
      })
    ) {
      throw new AppError("OLD Password Not Correct", 400);
    }

    if (newPassword == oldPassword) {
      throw new AppError("New Password Cannot Be Similar To Your Old Password");
    }

    const hash = Hash({plainText: newPassword});
    req.user.password = hash;
    req.user.changeCredential = new Date();
    await req.user.save();

    successResponse({
      res,
      status: 200,
      message: "Password Updated Successfully 🥳",
    });
  };

  logout = async (req: Request, res: Response, next: NextFunction) => {
    const {flag} = req.query;
    switch (flag) {
      case LogOutEnum.all:
        req.user.changeCredential = new Date();
        await req.user.save();

        await redisService.deleteKey(
          await redisService.keys(redisService.getKeyUserId(req.user._id)),
        );
        break;

      default:
        await redisService.setValue({
          key: redisService.revokeKey({
            userId: req.user._id,
            jti: req.verify.jti!,
          }),
          value: `${req.verify.jti}`,
          ttl: req.verify.exp! - Math.floor(Date.now() / 1000),
        });
        break;
    }

    successResponse({
      res,
      status: 200,
      message: "Logout Successfully 👋",
    });
  };

  signUpWithGmail = async (req: Request, res: Response, next: NextFunction) => {
    const {idToken} = req.body;
    const client = new OAuth2Client();
    const ticket = await client.verifyIdToken({
      idToken,
      audience: WEB_CLIENT_ID!,
    });
    const payload: Partial<TokenPayload> | undefined = ticket.getPayload();

    const {email, email_verified, name, picture} = payload!;

    if (!email) {
      throw new AppError("Invalid Google Token", 400);
    }
    let user = await this._userModel.findOne({
      filter: {email},
    });

    if (!user) {
      user = await this._userModel.create({
        data: {
          email,
          confirmed: email_verified,
          userName: name,
          profilePicture: picture,
          provider: ProviderEnum.google,
        } as Partial<IUser>,
      });
    }
    if (user.provider == ProviderEnum.local) {
      throw new AppError("Please Log In With Local System", 400);
    }

    // SignIn Steps
    const access_token = tokenService.GenerateToken({
      payload: {
        id: user.id,
        email: user.email,
      },
      secretKey:
        req.user.role == RoleEnum.user
          ? ACCESS_SECRET_KEY_USER!
          : ACCESS_SECRET_KEY_ADMIN!,
    });

    successResponse({
      res,
      message: "Sign In Successfully Enjoy 🥳",
      status: 200,
      data: {access_token},
    });
  };
}

export default new AuthService();
