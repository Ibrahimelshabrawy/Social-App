import {Router} from "express";
import chatService from "./chat.service";
import {authentication} from "../../common/middlewares/authentication.middleware";
import {multerCloud} from "../../common/middlewares/multer";
import {MulterEnum, StoreEnum} from "../../common/enum/multer.enum";
import {Validation} from "../../common/middlewares/validation";
import {createGroupSchema} from "./chat.validation";
const chatRouter = Router({mergeParams: true});

chatRouter.get("/", authentication, chatService.getChat);
chatRouter.get("/group/:groupId", authentication, chatService.getGroupChat);
chatRouter.post(
  "/create-group",
  authentication,
  multerCloud({
    custom_types: MulterEnum.image,
    store_type: StoreEnum.memory,
  }).single("attachment"),
  Validation(createGroupSchema),
  chatService.createChatGroup,
);

export default chatRouter;
