import express from "express";
import type {NextFunction, Request, Response} from "express";
import cors from "cors";
import helmet from "helmet";
import {rateLimit} from "express-rate-limit";
import {PORT} from "./config/config.service";
import {
  AppError,
  globalErrorHandling,
} from "./common/utils/global-error-handling";
import authRouter from "./modules/auth/auth.controller";
import connectDB from "./DB/connectionDB";
import RedisService from "./common/utils/services/redis.service";
import userRouter from "./modules/users/user.controller";
import postRouter from "./modules/posts/post.controller";
import {createHandler} from "graphql-http/lib/use/express";

import storyRouter from "./modules/stories/story.controller";
import friendRouter from "./modules/friends/friends.controller";
import {gql_schema} from "./modules/graphql/graphql.schema";
import {authentication_gql} from "./common/middlewares/authentication.middleware";
import socketGateway from "./modules/real-time/socket.gateway";
import {S3Service} from "./common/utils/services/s3.service";
import {pipeline} from "node:stream/promises";
import chatRouter from "./modules/chat/chat.controller";

const app: express.Application = express();

const bootstrap = async () => {
  const limiter = rateLimit({
    windowMs: 5 * 60 * 100,
    limit: 100,
  });
  app.use(express.json());
  app.use(
    cors({origin: "*"}),
    helmet({
      crossOriginResourcePolicy: {
        policy: "cross-origin",
      },
    }),
    limiter,
  );
  connectDB();
  RedisService.connectRedis();

  app.get("/", (req: Request, res: Response, next: NextFunction) =>
    res.status(200).json({
      message: "Welcome To Social App 🥳🥳",
    }),
  );

  app.get(
    "/upload/*path",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const {path} = req.params as {path: string[]};
        const key = path.join("/");
        const {download} = req.query;

        const result = await new S3Service().getFile(key);

        if (!result.Body) {
          return next(new AppError("File Not Found", 404));
        }

        res.setHeader(
          "Content-Type",
          result.ContentType || "application/octet-stream",
        );

        if (download === "true") {
          res.setHeader(
            "Content-Disposition",
            `attachment; filename="${path.at(-1)}"`,
          );
        }

        await pipeline(result.Body as NodeJS.ReadableStream, res);
      } catch (error) {
        if (res.headersSent) {
          return;
        }

        next(error);
      }
    },
  );

  //Routes
  app.use("/auth", authRouter);
  app.use("/user", userRouter);
  app.use("/posts", postRouter);
  app.use("/story", storyRouter);
  app.use("/friends", friendRouter);
  app.use("/chat", chatRouter);

  app.use(
    "/graphql",
    authentication_gql,
    createHandler({schema: gql_schema, context: (req) => ({req})}),
  );

  app.get("{/*demo}", (req: Request, res: Response, next: NextFunction) => {
    throw new AppError(
      `The URL : ${req.originalUrl} with method:${req.method} Is Not Found 😔`,
      404,
    );
  });

  app.use(globalErrorHandling);
  const httpServer = app.listen(PORT, () =>
    console.log(`Social app listening on PORT ${PORT}!`),
  );

  await socketGateway.InitIo(httpServer);
};

export default bootstrap;
