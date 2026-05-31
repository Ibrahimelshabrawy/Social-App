import {
  GraphQLEnumType,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from "graphql";

export let GenderType = new GraphQLEnumType({
  name: "Gender",
  values: {
    male: {value: "male"},
    female: {value: "female"},
  },
});

export let userType = new GraphQLObjectType({
  name: "User",
  fields: {
    id: {type: new GraphQLNonNull(GraphQLInt)},
    name: {type: new GraphQLNonNull(GraphQLString)},
    age: {type: new GraphQLNonNull(GraphQLInt)},
    gender: {type: new GraphQLNonNull(GenderType)},
  },
});
