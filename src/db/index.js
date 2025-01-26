import mongoose from "mongoose";
import { config } from "../config/config.js";
const mongodbUri = config.get("mongodbUri");

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(`${mongodbUri}`);
    console.log(
      `\n MongoDB connected !! DB HOST: ${connectionInstance.connection.host}`
    );
  } catch (error) {
    console.log("MONGODB connection FAILED ", error);
    process.exit(1);
  }
};

export default connectDB;
