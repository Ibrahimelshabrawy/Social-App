import z from "zod";
import {createGroupSchema} from "./chat.validation";

export type CreateGroupDto = z.infer<typeof createGroupSchema.body>;
