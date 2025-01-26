import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { config } from "../config/config.js";
const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
      lowercase: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      unique: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    avatar: {
      type: {
        data: Buffer, // Binary data for the avatar
        contentType: String, // MIME type (e.g., 'image/jpeg')
      },
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "user", "subUser"],
      default: "admin",
      required: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    refreshToken: {
      type: String,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.isPasswordCorrect = async function (password) {
  //returns true or false
  return await bcrypt.compare(password, this.password); //.compare(data from user, encrypted pass)
};

const accessToken = config.get("accessToken");
const refreshToken = config.get("refreshToken");
const expiryAccessToken = config.get("expiryAccessToken");
const expiryRefreshToken = config.get("expiryRefreshToken");

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      role: this.role,
      fullName: this.fullName,
    },
    accessToken,
    {
      expiresIn: expiryAccessToken,
    }
  );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    refreshToken,
    {
      expiresIn: expiryRefreshToken,
    }
  );
};

export const User = mongoose.model("User", userSchema);
