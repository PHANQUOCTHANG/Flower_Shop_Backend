import { Router } from "express";
import * as authCtrl from "@/module/auth/auth.controller";
import {
  LoginRequestDto,
  RefreshTokenRequestDto,
  RegisterRequestDto,
  ResetPasswordRequestDto,
} from "@/module/auth/auth.request";
import validationMiddleware from "@/middleware/validate.middleware";
import {
  SendOtpRequestDto,
  VerifyOtpRequestDto,
} from "@/module/auth/otp/otp.request";

const router = Router();

// ================= AUTH =================

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Đăng ký tài khoản mới
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *               name:
 *                 type: string
 *                 example: John Doe
 *     responses:
 *       201:
 *         description: Đăng ký thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       500:
 *         description: Lỗi server
 */
// POST | /api/auth/register | Đăng ký tài khoản mới
router.post(
  "/register",
  validationMiddleware(RegisterRequestDto),
  authCtrl.register,
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Đăng nhập
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Đăng nhập thành công
 *       400:
 *         description: Thông tin đăng nhập không hợp lệ
 *       500:
 *         description: Lỗi server
 */
// POST | /api/auth/login | Đăng nhập
router.post("/login", validationMiddleware(LoginRequestDto), authCtrl.login);

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     summary: Làm mới access token
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token đã được làm mới
 *       401:
 *         description: Token không hợp lệ
 *       500:
 *         description: Lỗi server
 */
// POST | /api/auth/refresh-token | Làm mới access token
router.post(
  "/refresh-token",
  validationMiddleware(RefreshTokenRequestDto),
  authCtrl.refresh,
);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Đăng xuất
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Đăng xuất thành công
 *       401:
 *         description: Không được phép
 *       500:
 *         description: Lỗi server
 */
// POST | /api/auth/logout | Đăng xuất
router.post(
  "/logout",
  validationMiddleware(RefreshTokenRequestDto),
  authCtrl.logout,
);

// ================= OTP =================

/**
 * @swagger
 * /api/auth/send-otp:
 *   post:
 *     summary: Gửi OTP
 *     tags:
 *       - OTP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: OTP đã được gửi
 *       400:
 *         description: Email không hợp lệ
 *       500:
 *         description: Lỗi server
 */
// POST | /api/auth/send-otp | Gửi OTP
router.post(
  "/send-otp",
  validationMiddleware(SendOtpRequestDto),
  authCtrl.sendOtp,
);

/**
 * @swagger
 * /api/auth/verify-otp:
 *   post:
 *     summary: Xác thực OTP
 *     tags:
 *       - OTP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: OTP xác thực thành công
 *       400:
 *         description: OTP không hợp lệ
 *       500:
 *         description: Lỗi server
 */
// POST | /api/auth/verify-otp | Xác thực OTP
router.post(
  "/verify-otp",
  validationMiddleware(VerifyOtpRequestDto),
  authCtrl.verifyOtp,
);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Đặt lại mật khẩu
 *     tags:
 *       - OTP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - newPassword
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               newPassword:
 *                 type: string
 *                 example: newpassword123
 *     responses:
 *       200:
 *         description: Mật khẩu đã được đặt lại thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       500:
 *         description: Lỗi server
 */
// POST | /api/auth/reset-password | Đặt lại mật khẩu
router.post(
  "/reset-password",
  validationMiddleware(ResetPasswordRequestDto),
  authCtrl.resetPassword,
);

export default router;
