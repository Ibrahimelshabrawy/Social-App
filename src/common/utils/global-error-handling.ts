import type {NextFunction, Request, Response} from "express";

export class AppError extends Error {
  constructor(
    public message: any,
    public statusCode?: number,
  ) {
    super(message);
    ((this.message = message), (this.statusCode = statusCode));
  }
}

export const globalErrorHandling = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const status = (err.statusCode as number) || 500;
  res.status(status).json({
    message: err.message,
    status,
    stack: err.stack,
  });
};
