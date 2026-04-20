import mongoose, {Schema} from "mongoose";
import {MONGO_URI} from "../config/config.service";

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI, {serverSelectionTimeoutMS: 10000});
    console.log("Connect To DB Successfully 🥳🥳");
  } catch (error) {
    console.log("Connect To DB Failed 😔😔", error);
  }
};

export default connectDB;
