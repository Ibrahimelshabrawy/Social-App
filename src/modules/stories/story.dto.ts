import z from "zod";
import {createStorySchema} from "./story.validation";

export type CreateStoryDTO = z.infer<typeof createStorySchema.body>;
