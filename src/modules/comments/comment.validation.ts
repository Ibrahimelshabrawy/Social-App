import * as z from "zod";
import {
  AllowCommentEnum,
  AvailabilityEnum,
  OnModelEnum,
  ReactEnum,
} from "../../common/enum/post.enum";
import {generalRules} from "../../common/utils/generalRules";

export const createCommentSchema = {
  body: z
    .object({
      content: z.string().optional(),
      attachments: z.array(generalRules.file).optional(),
      tags: z.array(generalRules.id).optional(),
      onModel: z.enum(OnModelEnum),
    })
    .superRefine((args, ctx) => {
      if (!args.content && !args.attachments?.length) {
        ctx.addIssue({
          code: "custom",
          path: ["content"],
          message: "One Of Content Or Attachments At Least Is Required !",
        });
      }

      if (args?.tags) {
        const uniqueTags = new Set(args.tags);
        if (args.tags.length !== uniqueTags.size) {
          ctx.addIssue({
            code: "custom",
            path: ["tags"],
            message: "Duplicate Tags",
          });
        }
      }
    }),
  params: z.strictObject({
    postId: generalRules.id,
    commentId: generalRules.id.optional(),
  }),
};

export const updateCommentSchema = {
  body: z
    .object({
      content: z.string().optional(),
      attachments: z.array(generalRules.file).optional(),
      removeAttachments: z.array(z.string()).optional(),
      tags: z.array(generalRules.id).optional(),
      removeTags: z.array(z.string()).optional(),
    })
    .superRefine((args, ctx) => {
      if (args?.tags) {
        const uniqueTags = new Set(args.tags);
        if (args.tags.length !== uniqueTags.size) {
          ctx.addIssue({
            code: "custom",
            path: ["tags"],
            message: "Duplicate Tags",
          });
        }
      }
    }),

  params: z.strictObject({
    commentId: generalRules.id,
    postId: generalRules.id,
  }),
};

export const reactCommentSchema = {
  params: z.object({
    postId: generalRules.id,
    commentId: generalRules.id,
  }),
  body: z.object({
    reactType: z.enum(ReactEnum),
  }),
};
