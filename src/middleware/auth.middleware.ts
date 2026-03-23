import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import AppError from "../utils/appError";
import { JwtPayload } from "@/types/express";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined");
}

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Middleware xác thực JWT
 */
export const requireAuth = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(new AppError("Unauthorized", 401));
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return next(new AppError("Unauthorized", 401));
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    req.user = decoded ;

    next();
  } catch {
    return next(new AppError("Invalid or expired token", 401));
  }
};

/**
 * Middleware kiểm tra role
 */
export const requireRole =
  (...roles: string[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("Unauthorized", 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError("Forbidden", 403));
    }

    next();
  };
