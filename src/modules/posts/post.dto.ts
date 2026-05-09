import z from "zod";
import {createPostSchema, likePostSchema} from "./post.validation";

export type CreatePostDTO = z.infer<typeof createPostSchema.body>;
export type likePostDTO = z.infer<typeof likePostSchema.params>;
