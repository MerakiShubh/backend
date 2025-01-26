import express from "express";
const app = express();
import cors from "cors";
import cookieParser from "cookie-parser";
import { config } from "./config/config.js";

export { app };

//cors settings
const corsOrigin = config.get("corsOrigin");
app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);

//incoming data setting
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

app.use((req, res, next) => {
  res.setHeader("Content-Type", "application/json");
  next();
});

// routes import

import userRouter from "./routes/user.route.js";

app.use("/api/v1/users", userRouter);
