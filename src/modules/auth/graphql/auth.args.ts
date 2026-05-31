import {
  GraphQLEnumType,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
} from "graphql";
import {GenderType} from "./auth.type";

export const createUserArgs = {
  id: {type: new GraphQLNonNull(GraphQLInt)},
  name: {type: new GraphQLNonNull(GraphQLString)},
  age: {type: new GraphQLNonNull(GraphQLInt)},
  gender: {type: new GraphQLNonNull(GenderType)},
};
