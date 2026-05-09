import type {NextFunction, Request, Response} from "express";
import {ZodType} from "zod";
import {AppError} from "../utils/global-error-handling";

type ReqType = keyof Request;
type SchemaType = Partial<Record<ReqType, ZodType>>;

export const Validation = (schema: SchemaType) => {
  return (req: Request, res: Response, next: NextFunction) => {
    let validationErrors = [];
    for (const key of Object.keys(schema) as ReqType[]) {
      if (!schema[key]) continue;
      if (req?.file) {
        req.body.attachment = req.file;
      }
      if (req?.files) {
        req.body.attachments = req.files;
      }
      const result = schema[key].safeParse(req[key]);
      if (!result.success) {
        for (const issue of result.error.issues) {
          validationErrors.push({
            key,
            path: issue.path[0],
            message: issue.message,
          });
        }
      }
    }
    if (validationErrors.length > 0) {
      throw new AppError(validationErrors as unknown as string, 400);
    }
    next();
  };
};
