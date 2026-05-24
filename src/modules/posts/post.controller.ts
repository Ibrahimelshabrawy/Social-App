import {Router} from "express";
import {authentication} from "../../common/middlewares/authentication.middleware";
import {authorization} from "../../common/middlewares/authorization.middleware";
import {multerCloud} from "../../common/middlewares/multer";
import {StoreEnum} from "../../common/enum/multer.enum";
import {Validation} from "../../common/middlewares/validation";
import * as postValidation from "./post.validation";
import postService from "./post.service";
import commentRouter from "../comments/comment.controller";

const postRouter = Router();

postRouter.use("/:postId/comments/", commentRouter);
postRouter.use("/:postId/comments/create{/:commentId/replies}", commentRouter);

postRouter.post(
  "/create",
  authentication,
  multerCloud({store_type: StoreEnum.memory}).array("attachments"),
  Validation(postValidation.createPostSchema),
  postService.createPost,
);

postRouter.patch(
  "/update/:postId",
  authentication,
  multerCloud({store_type: StoreEnum.memory}).array("attachments"),
  Validation(postValidation.updatePostSchema),
  postService.updatePost,
);

postRouter.get("/", authentication, postService.getPosts);
postRouter.get("/news-feed", authentication, postService.getNewsFeed);

postRouter.get(
  "/:postId",
  authentication,
  Validation(postValidation.CheckPostIdSchema),
  postService.getPost,
);

postRouter.delete(
  "/:postId",
  authentication,
  Validation(postValidation.CheckPostIdSchema),
  postService.deletePost,
);
postRouter.delete(
  "/soft-delete/:postId",
  authentication,
  Validation(postValidation.CheckPostIdSchema),
  postService.softDeletePost,
);

postRouter.get(
  "/restore-post/:postId",
  authentication,
  Validation(postValidation.CheckPostIdSchema),
  postService.restorePost,
);

postRouter.patch(
  "/react/:postId",
  authentication,
  Validation(postValidation.CheckPostIdSchema),
  postService.reactPost,
);

postRouter.post(
  "/:postId/save",
  authentication,
  Validation(postValidation.CheckPostIdSchema),
  postService.savePost,
);

export default postRouter;
