import z from "zod";
import {createCommentSchema, updateCommentSchema} from "./comment.validation";

export type CreateCommentDTO = z.infer<typeof createCommentSchema.body>;
export type updateCommentDTO = z.infer<typeof updateCommentSchema.body>;
