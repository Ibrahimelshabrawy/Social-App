import {Router} from "express";
import authService from "./auth.service";
import {Validation} from "../../common/middlewares/validation";
import * as authValidation from "./auth.validation";
import {authentication} from "../../common/middlewares/authentication.middleware";
import {multerCloud} from "../../common/middlewares/multer";
import {MulterEnum, StoreEnum} from "../../common/enum/multer.enum";
import chatRouter from "../chat/chat.controller";
const authRouter = Router();

authRouter.use("/:userId/chat", chatRouter);

authRouter.post(
  "/signup",
  Validation(authValidation.signUpSchema),
  authService.signup,
);

authRouter.post(
  "/confirm-email",
  Validation(authValidation.confirmEmailSchema),
  authService.confirmEmail,
);

authRouter.post(
  "/signin",
  Validation(authValidation.signInSchema),
  authService.signIn,
);

authRouter.post(
  "/update-password",
  authentication,
  Validation(authValidation.updatePasswordSchema),
  authService.updatePassword,
);

authRouter.post("/logout", authentication, authService.logout);
authRouter.post("/signup/gmail", authService.signUpWithGmail);

export default authRouter;
