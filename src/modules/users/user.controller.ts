import {Router} from "express";
import {authentication} from "../../common/middlewares/authentication.middleware";
import userService from "./user.service";
import {authorization} from "../../common/middlewares/authorization.middleware";
import {RoleEnum} from "../../common/enum/user.enum";

const userRouter = Router();
userRouter.get("/profile", authentication, userService.getProfile);
userRouter.get("/saved-posts", authentication, userService.getSavedPosts);
userRouter.get("/:userId/posts", authentication, userService.getUserPosts);
userRouter.get(
  "/:userId/comments",
  authentication,
  userService.getUserComments,
);
userRouter.get("/:userId/replies", authentication, userService.getUserReplies);

export default userRouter;
