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

const app: express.Application = express();

const bootstrap = () => {
  const limiter = rateLimit({
    windowMs: 5 * 60 * 100,
    limit: 100,
  });
  app.use(express.json());
  app.use(cors({origin: "*"}), helmet(), limiter);

  connectDB();
  RedisService.connectRedis();

  app.get("/", (req: Request, res: Response, next: NextFunction) =>
    res.status(200).json({
      message: "Welcome To Social App 🥳🥳",
    }),
  );

  //Routes
  app.use("/auth", authRouter);
  app.use("/user", userRouter);
  app.use("/posts", postRouter);
  app.use("/story", storyRouter);
  app.use("/friends", friendRouter);

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
  app.listen(PORT, () => console.log(`Social app listening on PORT ${PORT}!`));
};

export default bootstrap;
