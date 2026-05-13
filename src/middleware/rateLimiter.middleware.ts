// src/middleware/rateLimiter.middleware.ts
import { rateLimit } from 'express-rate-limit';

// 1. Checkout (Đặt hàng) - 5 requests / 1 phút
export const checkoutRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message: 'Bạn đặt hàng quá nhanh, vui lòng thử lại sau.',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
});

// 2. Global Rate Limiter - 100 requests / 1 phút (Bảo vệ cơ bản chống DDoS)
export const globalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message: 'Hệ thống đang quá tải, vui lòng quay lại sau ít phút.',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
});

// 3. Auth Rate Limiter (Login, Register) - 10 requests / 5 phút
export const authRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message: 'Bạn đã thử quá nhiều lần, vui lòng chờ 5 phút trước khi thử lại.',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
});

// 4. OTP Rate Limiter (Send OTP) - 3 requests / 5 phút
export const otpRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message: 'Bạn đã yêu cầu gửi mã OTP quá nhiều lần. Vui lòng chờ 5 phút.',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
});

// 5. API Actions Limiter (Review, Cart) - 20 requests / 1 phút
export const apiActionRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message: 'Thao tác quá nhanh, vui lòng thử lại sau giây lát.',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
});
    