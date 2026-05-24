import * as z from "zod";
import {
  AllowCommentEnum,
  AvailabilityEnum,
  ReactEnum,
} from "../../common/enum/post.enum";
import {generalRules} from "../../common/utils/generalRules";

export const createStorySchema = {
  body: z
    .object({
      caption: z.string().optional(),
      attachments: z.array(generalRules.file),
      tags: z.array(generalRules.id).optional(),
    })
    .superRefine((args, ctx) => {
      if (!args.attachments?.length) {
        ctx.addIssue({
          code: "custom",
          path: ["media"],
          message: "Attachments Is Required !",
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

export const CheckStoryIdSchema = {
  params: z.object({
    storyId: generalRules.id,
  }),
};
