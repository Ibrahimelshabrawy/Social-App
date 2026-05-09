import * as z from "zod";
import {AllowCommentEnum, AvailabilityEnum} from "../../common/enum/post.enum";
import {generalRules} from "../../common/utils/generalRules";

export const createPostSchema = {
  body: z
    .object({
      content: z.string().optional(),
      attachments: z.array(generalRules.file).optional(),
      tags: z.array(generalRules.id).optional(),
      availability: z.enum(AvailabilityEnum).default(AvailabilityEnum.public),
      allowComments: z.enum(AllowCommentEnum).default(AllowCommentEnum.allow),
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
};

export const likePostSchema = {
  params: z.object({
    postId: generalRules.id,
  }),
};
