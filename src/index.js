import { app } from "./app.js";
import dotenv from "dotenv";
import { config } from "./config/config.js";
import connectDB from "./db/index.js";
dotenv.config({
  path: "./.env",
});

const port = config.get("port");

app.on("error", (error) => {
  console.log("Server Run Failed :", error);
  throw error;
});

connectDB()
  .then(() => {
    // Start the server
    app.listen(port || 3000, () => {
      console.log(`⚙️ Server is running at port : ${port}`);
    });
  })
  .catch((err) => {
    console.log("❌ MONGO DB connection failed!", err);
  });
