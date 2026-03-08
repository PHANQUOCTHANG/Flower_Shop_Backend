import { authService, otpService } from "@/config/container";
import asyncHandler from "@/utils/asyncHandler";
import { Request, Response } from "express";

// Cookie config dùng chung
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

// POST | /api/auth/register
export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.register(req.body);

  // Lưu refresh token vào cookie
  res.cookie("refreshToken", result.refreshToken, cookieOptions);

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
  console.log("login", req.body) ;
  const result = await authService.login(req.body);

  // Lưu refresh token
  res.cookie("refreshToken", result.refreshToken, cookieOptions);

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
  console.log("refresh", req.cookies);
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({
      status: "error",
      message: "Refresh token missing",
    });
  }

  const result = await authService.refresh(refreshToken);

  // Rotate refresh token
  res.cookie("refreshToken", result.refreshToken, cookieOptions);

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

  res.clearCookie("refreshToken", {
    path: "/",
  });

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

    await authService.resetPassword({
      email,
      otp,
      newPassword,
    });

    res.status(204).json({
      status: "success",
      data: null,
    });
  }
);