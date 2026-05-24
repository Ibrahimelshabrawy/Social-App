import {Router} from "express";
import {authentication} from "../../common/middlewares/authentication.middleware";
import {authorization} from "../../common/middlewares/authorization.middleware";
import {multerCloud} from "../../common/middlewares/multer";
import {StoreEnum} from "../../common/enum/multer.enum";
import {Validation} from "../../common/middlewares/validation";
import * as commentValidation from "./comment.validation";
import commentService from "./comment.service";

const commentRouter = Router({mergeParams: true});

commentRouter.post(
  "/",
  authentication,
  multerCloud({store_type: StoreEnum.memory}).array("attachments"),
  Validation(commentValidation.createCommentSchema),
  commentService.createCommentOrReply,
);
commentRouter.get("/", authentication, commentService.getCommentsWithReplies);
commentRouter.delete(
  "/:commentId",
  authentication,
  commentService.deleteCommentWithReplies,
);

commentRouter.delete(
  "/:commentId/replies/:replyId",
  authentication,
  commentService.deleteReply,
);

commentRouter.patch(
  "/update/:commentId",
  authentication,
  multerCloud({store_type: StoreEnum.memory}).array("attachments"),
  Validation(commentValidation.updateCommentSchema),
  commentService.updateCommentOrReply,
);

commentRouter.patch(
  "/react/:commentId",
  authentication,
  Validation(commentValidation.reactCommentSchema),
  commentService.reactComment,
);

export default commentRouter;
