import { authService, otpService } from "@/config/container";
import { getUserId } from "@/helpers/getUserId";
import asyncHandler from "@/utils/asyncHandler";
import { Request, Response } from "express";

// Cookie config dùng chung — expires đồng bộ với token thực tế
const buildCookieOptions = (expiresAt: Date) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  expires: expiresAt, // Browser tự xóa đúng lúc token hết hạn
});

// POST | /api/auth/register
export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.register(req.body);

  res.cookie(
    "refreshToken",
    result.refreshToken,
    buildCookieOptions(result.refreshTokenExpiresAt),
  );
  res.cookie("user", JSON.stringify(result.user), {
    httpOnly: false,
    path: "/",
    expires: result.refreshTokenExpiresAt, // user cookie cùng vòng đời với refreshToken
  });

  res.status(201).json({
    status: "success",
    data: {
      accessToken: result.accessToken,
      user: result.user,
    },
  });
});

// POST | /api/auth/login
export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body);

  res.cookie(
    "refreshToken",
    result.refreshToken,
    buildCookieOptions(result.refreshTokenExpiresAt),
  );
  res.cookie("user", JSON.stringify(result.user), {
    httpOnly: false,
    path: "/",
    expires: result.refreshTokenExpiresAt,
  });

  res.status(200).json({
    status: "success",
    data: {
      accessToken: result.accessToken,
      user: result.user,
    },
  });
});

// POST | /api/auth/refresh
export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({
      status: "error",
      message: "Refresh token missing",
    });
  }

  const result = await authService.refresh(refreshToken);

  res.cookie(
    "refreshToken",
    result.refreshToken,
    buildCookieOptions(result.refreshTokenExpiresAt),
  );
  res.cookie("user", JSON.stringify(result.user), {
    httpOnly: false,
    path: "/",
    expires: result.refreshTokenExpiresAt,
  });

  res.status(200).json({
    status: "success",
    data: {
      accessToken: result.accessToken,
      user: result.user,
    },
  });
});

// POST | /api/auth/logout
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken;

  if (refreshToken) {
    await authService.logout(refreshToken);
  }

  res.clearCookie("refreshToken", { path: "/" });
  res.clearCookie("user", { path: "/" });

  res.status(204).json({
    status: "success",
    data: null,
  });
});

// POST | /api/auth/send-otp
export const sendOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  await otpService.send(email);

  res.status(204).json({
    status: "success",
    data: null,
  });
});

// POST | /api/auth/verify-otp
export const verifyOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email, otp } = req.body;

  await otpService.verify(email, otp);

  res.status(204).json({
    status: "success",
    data: null,
  });
});

// POST | /api/auth/reset-password
export const resetPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const { email, otp, newPassword } = req.body;

    await authService.resetPassword({ email, otp, newPassword });

    res.status(204).json({
      status: "success",
      data: null,
    });
  },
);

// POST | /api/auth/change-password
export const changePassword = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const { currentPassword, newPassword, confirmPassword } = req.body;

    await authService.changePassword(userId, {
      currentPassword,
      newPassword,
      confirmPassword,
    });

    res.status(204).json({
      status: "success",
      data: null,
    });
  },
);
