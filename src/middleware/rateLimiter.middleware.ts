// src/middleware/rateLimiter.middleware.ts
import { rateLimit } from 'express-rate-limit';

export const checkoutRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  // Không dùng store → tự dùng memory store mặc định
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message: 'Bạn đặt hàng quá nhanh, vui lòng thử lại sau.',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
});