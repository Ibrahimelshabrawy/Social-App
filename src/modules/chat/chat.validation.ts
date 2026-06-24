import * as z from "zod";
import {
  AllowCommentEnum,
  AvailabilityEnum,
  ReactEnum,
} from "../../common/enum/post.enum";
import {generalRules} from "../../common/utils/generalRules";

export const createGroupSchema = {
  body: z
    .object({
      group: z.string(),
      attachment: generalRules.file.optional(),
      participants: z.array(generalRules.id),
    })
    .superRefine((args, ctx) => {
      if (args?.participants) {
        const uniqueParticipants = new Set(args.participants);
        if (args.participants.length !== uniqueParticipants.size) {
          ctx.addIssue({
            code: "custom",
            path: ["participants"],
            message: "Duplicate participants",
          });
        }
      }
    }),
};
