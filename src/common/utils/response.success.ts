import type {Response} from "express";

export const successResponse = ({
  res,
  status = 200,
  message = "Done",
  data = undefined,
}: {
  res: Response;
  status?: number;
  message?: string;
  data?: any;
}) => {
  res.status(status).json({
    message,
    data,
  });
};
