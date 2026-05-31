import {
  GraphQLEnumType,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
} from "graphql";
import {AppError} from "../../../common/utils/global-error-handling";
import {GenderType, userType} from "./auth.type";
import {createUserArgs} from "./auth.args";

let users = [
  {
    id: 1,
    name: "John Doe",
    age: 30,
    gender: "male",
  },
  {
    id: 2,
    name: "Jane Doe",
    age: 25,
    gender: "male",
  },
  {
    id: 3,
    name: "Bob Smith",
    age: 40,
    gender: "male",
  },
];

class UserFields {
  constructor() {}

  query = () => {
    return {
      users: {
        type: new GraphQLList(userType),
        resolve: () => users,
      },
    };
  };

  mutation = () => {
    return {
      createUser: {
        type: userType,
        args: createUserArgs,
        resolve: (parent: any, args: any) => {
          const {id, name, age, gender} = args;
          const userExist = users.find((user) => user.id === id);
          if (userExist) {
            throw new AppError(`User with id ${id} already exists`, 400);
          }
          users.push(args);
          return args;
        },
      },
    };
  };
}

export default new UserFields();
