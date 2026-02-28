import { authService, otpService } from "@/config/container";
import asyncHandler from "@/utils/asyncHandler";
import { Request, Response } from "express";

// POST | /api/auth/register | Đăng ký tài khoản
export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.register(req.body);

  // Lưu refresh token vào cookie (HttpOnly)
  res.cookie("refreshToken", result.refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/api/auth/refresh",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  // Chỉ trả access token và thông tin user cho FE
  res.status(201).json({
    status: "success",
    data: {
      accessToken: result.accessToken,
      user: result.user,
    },
  });
});

// POST | /api/auth/login | Đăng nhập
export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body);
  // Lưu refresh token vào cookie (HttpOnly)
  res.cookie("refreshToken", result.refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/api/auth/refresh",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  // Trả access token và thông tin user
  res.status(200).json({
    status: "success",
    data: {
      accessToken: result.accessToken,
      user: result.user,
    },
  });
});

// POST | /api/auth/refresh | Làm mới access token
export const refresh = asyncHandler(async (req: Request, res: Response) => {
  // Lấy refresh token từ cookie
  const refreshToken = req.cookies.refreshToken;

  const result = await authService.refresh(refreshToken);

  // Rotate refresh token mới vào cookie
  res.cookie("refreshToken", result.refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/api/auth/refresh",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  // Chỉ trả access token mới
  res.status(200).json({
    status: "success",
    data: {
      accessToken: result.accessToken,
      user : result.user
    },
  });
});

// POST | /api/auth/logout | Đăng xuất
export const logout = asyncHandler(async (req: Request, res: Response) => {
  // Lấy refresh token từ cookie
  const refreshToken = req.cookies.refreshToken;

  // Thu hồi refresh token trong DB
  await authService.logout(refreshToken);

  // Xóa refresh token khỏi cookie
  res.clearCookie("refreshToken", {
    path: "/api/auth/refresh",
  });

  res.status(204).json({ status: "success", data: null });
});

// POST | /api/auth/send-otp | Gửi mã OTP
export const sendOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  // Gửi OTP về email
  await otpService.send(email);

  res.status(204).json({ status: "success", data: null });
});

// POST | /api/auth/verify-otp | Xác thực OTP
export const verifyOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email, otp } = req.body;

  // Xác thực OTP người dùng nhập
  await otpService.verify(email, otp);

  res.status(204).json({ status: "success", data: null });
});

// POST | /api/auth/reset-password | Đặt lại mật khẩu
export const resetPassword = asyncHandler(
  async (req: Request, res: Response) => {
    console.log(req.body);
    const { email, otp, newPassword } = req.body;

    // Đặt lại mật khẩu sau khi OTP hợp lệ
    await authService.resetPassword(email, otp, newPassword);

    res.status(204).json({ status: "success", data: null });
  }
);
