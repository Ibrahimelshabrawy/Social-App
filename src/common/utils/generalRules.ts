import {Types} from "mongoose";
import * as z from "zod";

export const generalRules = {
  id: z.string().refine(
    (value) => {
      return Types.ObjectId.isValid(value);
    },
    {
      message: "inValid id",
    },
  ),

  file: z.object({
    fieldname: z.string(),
    originalname: z.string(),
    encoding: z.string(),
    mimetype: z.string(),
    buffer: z.any().optional(),
    path: z.string().optional(),
    size: z.number(),
  }),
};
