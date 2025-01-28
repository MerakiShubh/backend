import { User } from "../models/user.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/AsyncHandler.js";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, username, password, role } = req.body;

  if (
    [fullName, email, username, password, role].some(
      (field) => field === undefined || field?.trim() === ""
    )
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // Check if the user already exists
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) throw new ApiError(409, "Email or Username already exists");
  console.log("Uploaded Files:", req.files);

  // Validate and store avatar
  if (!req.files || !req.files.avatar || req.files.avatar.length === 0) {
    throw new ApiError(400, "Avatar is required");
  }

  const avatar = {
    data: req.files.avatar[0].buffer, // Binary data of the avatar
    contentType: req.files.avatar[0].mimetype, // MIME type of the avatar
  };

  // Create the user
  const user = await User.create({
    fullName,
    avatar,
    email,
    password,
    role,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken -avatar"
  );

  if (!createdUser) throw new ApiError(500, "Account creation failed");

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  const { emailOrUsername, password } = req.body;

  if (!emailOrUsername || !password) {
    throw new ApiError(400, "Email/Username and Password are required");
  }

  const user = await User.findOne({
    $or: [{ email: emailOrUsername }, { username: emailOrUsername }],
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(400, "Invalid password");
  }

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  // Set refresh token as an HttpOnly cookie
  res.setHeader("Set-Cookie", [
    `refreshToken=${refreshToken}; Max-Age=${
      15 * 24 * 60 * 60
    }; Path=/; HttpOnly; Secure; SameSite=None`,
  ]);

  return res.status(200).json({
    success: true,
    data: { user, accessToken },
  });
});

const logoutUser = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  await User.findByIdAndUpdate(
    userId,
    {
      $unset: { refreshToken: 1 }, //removes the field form document
    },
    {
      new: true,
    }
  );

  res.setHeader("Set-Cookie", [
    "accessToken=; Max-Age=-1; Path=/; HttpOnly; Secure; SameSite=None",
    "refreshToken=; Max-Age=-1; Path=/; HttpOnly; Secure; SameSite=None",
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) throw new ApiError(401, "Unauthorized Request");

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) throw new ApiError(401, "Invalid refresh Token");

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is Expired or used");
    }

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    res.setHeader("Set-Cookie", [
      `accessToken=${accessToken}; Max-Age=${
        1 * 24 * 60 * 60
      }; Path=/; HttpOnly; Secure; SameSite=None`,
      `refreshToken=${newRefreshToken}; Max-Age=${
        15 * 24 * 60 * 60
      }; Path=/; HttpOnly; Secure; SameSite=None`,
    ]);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed successfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Wrong Current password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Password changed successfully"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
};
