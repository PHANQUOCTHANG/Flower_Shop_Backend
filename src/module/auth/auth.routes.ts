import { Router } from "express";
import * as authCtrl from "@/module/auth/auth.controller";
import validationMiddleware from "@/middleware/validate.middleware";
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  resetPasswordSchema,
} from "@/module/auth/auth.request";
import { sendOtpSchema, verifyOtpSchema } from "@/module/auth/otp/otp.request";

const router = Router();

// auth
// POST | /api/auth/register | Đăng ký tài khoản mới
router.post(
  "/register",
  validationMiddleware(registerSchema),
  authCtrl.register,
);

// POST | /api/auth/login | Đăng nhập
router.post("/login", validationMiddleware(loginSchema), authCtrl.login);

// POST | /api/auth/refresh-token | Làm mới access token
router.post(
  "/refresh-token",
  validationMiddleware(refreshTokenSchema),
  authCtrl.refresh,
);

// POST | /api/auth/logout | Đăng xuất
router.post(
  "/logout",
  authCtrl.logout,
);

// POST | /api/auth/send-otp | Gửi OTP
router.post("/send-otp", validationMiddleware(sendOtpSchema), authCtrl.sendOtp);

// POST | /api/auth/verify-otp | Xác thực OTP
router.post(
  "/verify-otp",
  validationMiddleware(verifyOtpSchema),
  authCtrl.verifyOtp,
);

// POST | /api/auth/reset-password | Đặt lại mật khẩu
router.post(
  "/reset-password",
  validationMiddleware(resetPasswordSchema),
  authCtrl.resetPassword,
);

export default router;
