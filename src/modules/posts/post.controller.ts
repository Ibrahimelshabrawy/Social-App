import {Router} from "express";
import {authentication} from "../../common/middlewares/authentication.middleware";
import {authorization} from "../../common/middlewares/authorization.middleware";
import {multerCloud} from "../../common/middlewares/multer";
import {StoreEnum} from "../../common/enum/multer.enum";
import {Validation} from "../../common/middlewares/validation";
import * as postValidation from "./post.validation";
import postService from "./post.service";

const postRouter = Router();

postRouter.post(
  "/create",
  authentication,
  multerCloud({store_type: StoreEnum.memory}).array("attachments"),
  Validation(postValidation.createPostSchema),
  postService.createPost,
);

postRouter.get("/", authentication, postService.getPosts);
postRouter.patch(
  "/like/:postId",
  authentication,
  Validation(postValidation.likePostSchema),
  postService.likePost,
);

export default postRouter;
