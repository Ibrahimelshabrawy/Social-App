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
import {
  GraphQLEnumType,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
} from "graphql";
import storyRouter from "./modules/stories/story.controller";
import friendRouter from "./modules/friends/friends.controller";

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

  // let users = [
  //   {
  //     id: 1,
  //     name: "John Doe",
  //     age: 30,
  //     gender: "male",
  //   },
  //   {
  //     id: 2,
  //     name: "Jane Doe",
  //     age: 25,
  //     gender: "male",
  //   },
  //   {
  //     id: 3,
  //     name: "Bob Smith",
  //     age: 40,
  //     gender: "male",
  //   },
  // ];

  // let GenderType = new GraphQLEnumType({
  //   name: "Gender",
  //   values: {
  //     male: {value: "male"},
  //     female: {value: "female"},
  //   },
  // });

  // let userType = new GraphQLObjectType({
  //   name: "User",
  //   fields: {
  //     id: {type: new GraphQLNonNull(GraphQLInt)},
  //     name: {type: new GraphQLNonNull(GraphQLString)},
  //     age: {type: new GraphQLNonNull(GraphQLInt)},
  //     gender: {type: new GraphQLNonNull(GenderType)},
  //   },
  // });

  // const schema = new GraphQLSchema({
  //   query: new GraphQLObjectType({
  //     name: "Query",
  //     fields: {
  //       users: {
  //         type: new GraphQLList(userType),
  //         resolve: () => users,
  //       },
  //     },
  //   }),
  //   mutation: new GraphQLObjectType({
  //     name: "Mutation",
  //     fields: {
  //       createUser: {
  //         type: userType,
  //         args: {
  //           id: {type: new GraphQLNonNull(GraphQLInt)},
  //           name: {type: new GraphQLNonNull(GraphQLString)},
  //           age: {type: new GraphQLNonNull(GraphQLInt)},
  //           gender: {type: new GraphQLNonNull(GenderType)},
  //         },
  //         resolve: (parent, args) => {
  //           const {id, name, age, gender} = args;
  //           const userExist = users.find((user) => user.id === id);
  //           if (userExist) {
  //             throw new AppError(`User with id ${id} already exists`, 400);
  //           }
  //           users.push(args);
  //           return args;
  //         },
  //       },
  //     },
  //   }),
  // });

  // app.use("/graphql", createHandler({schema}));

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
