import {GraphQLObjectType, GraphQLSchema} from "graphql";
import userFields from "../auth/graphql/auth.fields";

export const gql_schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: "Query",
    fields: {
      ...userFields.query(),
    },
  }),
  mutation: new GraphQLObjectType({
    name: "Mutation",
    fields: {
      ...userFields.mutation(),
    },
  }),
});
