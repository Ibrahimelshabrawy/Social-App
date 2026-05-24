import {Router} from "express";
import {authentication} from "../../common/middlewares/authentication.middleware";
import {authorization} from "../../common/middlewares/authorization.middleware";
import {multerCloud} from "../../common/middlewares/multer";
import {StoreEnum} from "../../common/enum/multer.enum";
import {Validation} from "../../common/middlewares/validation";
import * as friendValidation from "./friends.validation";
import friendService from "./friends.service";

const friendRouter = Router();

friendRouter.post(
  "/send-request/:receiverId",
  authentication,
  Validation(friendValidation.CheckReceiverIdSchema),
  friendService.sendFriendRequest,
);

friendRouter.patch(
  "/accept-request/:requestId",
  authentication,
  Validation(friendValidation.CheckRequestIdSchema),
  friendService.acceptFriendRequest,
);

friendRouter.patch(
  "/reject-request/:requestId",
  authentication,
  Validation(friendValidation.CheckRequestIdSchema),
  friendService.rejectFriendRequest,
);

friendRouter.delete(
  "/cancel-request/:requestId",
  authentication,
  Validation(friendValidation.CheckRequestIdSchema),
  friendService.cancelFriendRequest,
);

friendRouter.delete(
  "/unfriend/:friendId",
  authentication,
  Validation(friendValidation.CheckFriendIdSchema),
  friendService.unfriend,
);

friendRouter.get(
  "/requests/incoming",
  authentication,
  friendService.getIncomingFriendRequests,
);

friendRouter.get(
  "/requests/sent",
  authentication,
  friendService.getSentFriendRequests,
);

friendRouter.get("/", authentication, friendService.getFriendsList);

export default friendRouter;
