import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload as DefaultJwtPayload } from "jsonwebtoken";
import AppError from "../utils/appError";

// Kiểm tra biến môi trường khi server khởi động
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in environment variables");
}

const JWT_SECRET = process.env.JWT_SECRET as string;

// Kiểu dữ liệu payload của JWT
interface JwtPayload extends DefaultJwtPayload {
  id: string; // id user
  sub: string; // id user (standard JWT claim)
  email: string; // email user
  role: string; // role (admin, user...)
}

// Mở rộng Request của Express để thêm user
export interface AuthRequest extends Request {
  user: JwtPayload;
}

/**
 * Middleware xác thực JWT
 * - Kiểm tra Authorization header
 * - Verify token
 * - Lưu payload vào req.user
 */
export const requireAuth = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;

  // Kiểm tra header Authorization
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AppError("Unauthorized. Token missing.", 401));
  }

  // Lấy token từ header
  const token = authHeader.split(" ")[1];

  try {
    // Verify JWT
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    // Gắn thông tin user vào request
    req.user = decoded;

    next();
  } catch {
    return next(new AppError("Unauthorized. Invalid or expired token.", 401));
  }
};

/**
 * Middleware kiểm tra quyền (Role-based authorization)
 *
 * Ví dụ:
 * requireRole("admin")
 * requireRole("admin", "staff")
 */
export const requireRole =
  (...roles: string[]) =>
  (req: AuthRequest, _res: Response, next: NextFunction) => {
    // Kiểm tra user đã được xác thực chưa
    if (!req.user) {
      return next(new AppError("Unauthorized. User not authenticated.", 401));
    }

    // Kiểm tra role có nằm trong danh sách cho phép
    if (!roles.includes(req.user.role)) {
      return next(new AppError("Forbidden. You do not have permission.", 403));
    }

    next();
  };
