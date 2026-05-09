import {Model, Types} from "mongoose";
import BaseRepository from "./base.repository";
import PostModel, {IPost} from "../models/post.model";

class PostRepository extends BaseRepository<IPost> {
  constructor(protected readonly model: Model<IPost> = PostModel) {
    super(model);
  }
}

export default PostRepository;
