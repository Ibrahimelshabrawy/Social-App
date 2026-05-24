import {Router} from "express";
import {authentication} from "../../common/middlewares/authentication.middleware";
import {authorization} from "../../common/middlewares/authorization.middleware";
import {multerCloud} from "../../common/middlewares/multer";
import {StoreEnum} from "../../common/enum/multer.enum";
import {Validation} from "../../common/middlewares/validation";
import * as storyValidation from "./story.validation";
import storyService from "./story.service";

const storyRouter = Router();

storyRouter.post(
  "/create-story",
  authentication,
  multerCloud({
    store_type: StoreEnum.memory,
  }).array("attachments"),
  Validation(storyValidation.createStorySchema),
  storyService.createStory,
);

storyRouter.get("/stories-feed", authentication, storyService.getStoriesFeed);
storyRouter.patch(
  "/:storyId/view",
  authentication,
  Validation(storyValidation.CheckStoryIdSchema),
  storyService.viewStory,
);
storyRouter.get(
  "/:storyId/viewers",
  authentication,
  Validation(storyValidation.CheckStoryIdSchema),
  storyService.getStoryViewers,
);

storyRouter.delete("/:storyId", authentication, storyService.deleteStory);
export default storyRouter;
