import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import AppError from "../utils/appError";
import { JwtPayload } from "@/types/express";

// Lấy JWT secret từ environment variable
const JWT_SECRET = process.env.JWT_SECRET;

// Kiểm tra JWT secret có được cấu hình đúng không
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in environment variables");
}

// Trích xuất token từ header Authorization
const extractTokenFromHeader = (
  authHeader: string | undefined,
): string | null => {
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.split(" ")[1];
  return token || null;
};

// Xác thực token JWT
const verifyJWT = (token: string): JwtPayload => {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
};

// Xác thực người dùng thông qua JWT token
export const requireAuth = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  try {
    const authHeader = req.headers.authorization;

    // Kiểm tra header Authorization có hợp lệ không
    const token = extractTokenFromHeader(authHeader);
    if (!token) {
      return next(new AppError("Unauthorized", 401));
    }

    // Xác thực và giải mã token
    const decoded = verifyJWT(token);
    req.user = decoded;

    next();
  } catch {
    next(new AppError("Invalid or expired token", 401));
  }
};

// Kiểm tra quyền truy cập của người dùng dựa trên role
export const requireRole = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    // Kiểm tra người dùng đã được xác thực chưa
    if (!req.user) {
      return next(new AppError("Unauthorized", 401));
    }

    // Kiểm tra role của người dùng có trong danh sách quyền không
    if (!roles.includes(req.user.role)) {
      return next(new AppError("Forbidden", 403));
    }

    next();
  };
};
