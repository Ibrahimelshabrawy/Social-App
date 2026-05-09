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
  AWS_ACCESS_KEY,
  AWS_REGION,
  AWS_SECRET_ACCESS_KEY,
  REFRESH_SECRET_KEY_ADMIN,
  REFRESH_SECRET_KEY_USER,
  WEB_CLIENT_ID,
} from "../../config/config.service";
import {randomUUID} from "node:crypto";
import {OAuth2Client, TokenPayload} from "google-auth-library";
import {S3Service} from "../../common/utils/services/s3.service";
import {StoreEnum} from "../../common/enum/multer.enum";
import notificationService from "../../common/utils/services/notification.service";
class AuthService {
  private readonly _userRepo = new UserRepository();
  private readonly _redisService = redisService;
  private readonly _tokenService = tokenService;
  private readonly _notificationService = notificationService;
  private readonly _s3Service = new S3Service();

  constructor() {}

  sendEmailOtp = async ({
    email,
    subject,
  }: {
    email: string;
    subject: EventEnum;
  }) => {
    const blockedTTL = await this._redisService.ttl(
      this._redisService.blockedOtpKey({email, subject}),
    );
    if (blockedTTL > 0) {
      throw new Error(
        `You Are Blocked, Please Try Again After ${blockedTTL} Seconds`,
        {cause: 400},
      );
    }

    const otpTTL = await this._redisService.ttl(
      this._redisService.otpKey({email, subject}),
    );
    if (otpTTL > 0) {
      throw new Error(
        `Old OTP Has Not Expired Yet, Please Wait ${otpTTL} Seconds`,
      );
    }

    const maxOtp = await this._redisService.getValue(
      this._redisService.maxOtpKey({email, subject}),
    );
    if (maxOtp >= 3) {
      await this._redisService.setValue({
        key: this._redisService.blockedOtpKey({email, subject}),
        value: "1",
        ttl: 60,
      });

      throw new Error(
        "You Reach Maximum Number Of Resend OTP And You Will Be Blocked",
        {cause: 400},
      );
    }

    const otp = await generateOtp();

    eventEmitter.emit(EventEnum.confirmEmail, async () => {
      await sendEmail({
        to: email,
        subject: "Welcome To Social App",
        html: emailTemplate({otp, subject}),
      });

      await this._redisService.setValue({
        key: this._redisService.otpKey({email, subject}),
        value: Hash({plainText: `${otp}`}),
        ttl: 60 * 2,
      });

      await this._redisService.setValue({
        key: this._redisService.maxOtpKey({email, subject}),
        value: "1",
        ttl: 60 * 6,
      });
    });
  };

  resendOtp = async (req: Request, res: Response, next: NextFunction) => {
    const {email} = req.body;

    const user = await this._userRepo.checkUserExistByEmail(email);

    if (!user.confirmed) {
      throw new Error("User Not Confirmed", {cause: 404});
    }

    await this.sendEmailOtp({email, subject: EventEnum.confirmEmail});
    successResponse({
      res,
      message: "OTP Resend Successfully 🥳🥳",
      status: 200,
    });
  };

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

    await this._userRepo.checkEmailExist(email);

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

      await this._redisService.setValue({
        key: this._redisService.otpKey({
          email,
          subject: EventEnum.confirmEmail,
        }),
        value: Hash({plainText: `${otp}`}),
        ttl: 60,
      });

      await this._redisService.setValue({
        key: this._redisService.maxOtpKey({
          email,
          subject: EventEnum.confirmEmail,
        }),
        value: "1",
        ttl: 60 * 3,
      });
    });

    const user: HydratedDocument<IUser> = await this._userRepo.create({
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

    await this._userRepo.checkUserExistByEmail(email);

    const otpValue = await this._redisService.getValue(
      this._redisService.otpKey({email, subject: EventEnum.confirmEmail}),
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

    await this._userRepo.findOneAndUpdate({
      filter: {
        email,
        confirmed: {$exists: false},
        provider: ProviderEnum.local,
      },
      update: {confirmed: true},
    });

    this._redisService.deleteKey(
      this._redisService.otpKey({email, subject: EventEnum.confirmEmail}),
    );

    successResponse({
      res,
      status: 200,
      message: "Confirm Email Successfully 🥳🥳",
    });
  };

  signIn = async (req: Request, res: Response, next: NextFunction) => {
    const {email, password, fcm}: SignInDto = req.body;

    const user = await this._userRepo.checkUserExistByEmail(email);
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

    const access_token = this._tokenService.GenerateToken({
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

    const refresh_token = this._tokenService.GenerateToken({
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

    if (fcm) {
      await this._redisService.addFCM({userId: user._id, FCMToken: fcm});
      const tokens = await this._redisService.getFCMs(user._id);
      await this._notificationService.sendNotifications({
        tokens,
        data: {
          title: "LOGIN SUCCESSFULLY !",
          body: "Enjoy Using Application 🥳",
        },
      });
    }

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

    await this._userRepo.checkUserExistById(req.user._id);
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

        await this._redisService.deleteKey(
          await this._redisService.keys(
            this._redisService.getKeyUserId(req.user._id),
          ),
        );
        break;

      default:
        await this._redisService.setValue({
          key: this._redisService.revokeKey({
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
    const payload = ticket.getPayload() as TokenPayload;
    const {email, email_verified, given_name, family_name, picture} = payload!;

    if (!email) {
      throw new AppError("Invalid Google Token", 400);
    }
    let user = await this._userRepo.findOne({
      filter: {email},
    });

    if (!user) {
      user = await this._userRepo.create({
        data: {
          email: email!,
          confirmed: email_verified!,
          firstName: given_name!,
          lastName: family_name!,
          provider: ProviderEnum.google!,
        },
      });
    }
    if (user.provider == ProviderEnum.local) {
      throw new AppError("Please Log In With Local System", 400);
    }

    // SignIn Steps
    const access_token = this._tokenService.GenerateToken({
      payload: {
        id: user._id,
        email: user.email,
      },
      secretKey:
        user.role == RoleEnum.user
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

  forgetPassword = async (req: Request, res: Response, next: NextFunction) => {
    const {email} = req.body;
    const user = await this._userRepo.checkUserExistByEmail(email);
    if (!user.confirmed) {
      throw new Error("User Not Confirmed", {cause: 404});
    }

    await this.sendEmailOtp({email, subject: EventEnum.forgetPassword});

    successResponse({
      res,
      message: "OTP For Forget Password Send Successfully 🥳🥳",
      status: 200,
    });
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    const {email, password, otp} = req.body;

    const otpValue = await this._redisService.getValue(
      this._redisService.otpKey({email, subject: EventEnum.forgetPassword}),
    );

    if (!compare_match({plainText: otp, cipherText: otpValue})) {
      throw new Error("OTP Is Expired Or Incorrect Value", {cause: 400});
    }

    await this._userRepo.findOneAndUpdate({
      filter: {
        email,
        confirmed: {$exists: true},
        provider: ProviderEnum.local,
      },
      update: {
        password: Hash({plainText: password}),
        changeCredential: new Date(),
      },
    });

    await this._redisService.deleteKey(
      this._redisService.otpKey({email, subject: EventEnum.forgetPassword}),
    );

    successResponse({
      res,
      status: 200,
      message: "Password Reset Successfully 🥳🥳",
    });
  };

  test = async (req: Request, res: Response, next: NextFunction) => {
    const {ContentType, fileName} = req.body;
    const {Key, url} = await this._s3Service.createPreSignedUrl({
      path: `Users/${req?.user?._id}`,
      fileName,
      ContentType,
    });

    successResponse({
      res,
      status: 200,
      data: {Key, url},
    });
  };
}

export default new AuthService();
