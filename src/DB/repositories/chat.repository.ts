import {Model, Types} from "mongoose";
import BaseRepository from "./base.repository";
import ChatModel, {IChat} from "../models/chat.model";

class ChatRepository extends BaseRepository<IChat> {
  constructor(protected readonly model: Model<IChat> = ChatModel) {
    super(model);
  }
}

export default ChatRepository;
