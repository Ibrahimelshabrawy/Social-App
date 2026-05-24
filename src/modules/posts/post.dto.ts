import z from "zod";
import {
  createPostSchema,
  reactPostSchema,
  updatePostSchema,
} from "./post.validation";

export type CreatePostDTO = z.infer<typeof createPostSchema.body>;
export type updatePostDTO = z.infer<typeof updatePostSchema.body>;
export type reactPostDTO = z.infer<typeof reactPostSchema.body>;
