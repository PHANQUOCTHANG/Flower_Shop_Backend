// src/utils/jwt.ts
import jwt from "jsonwebtoken";
import AppError from "@/utils/appError";

interface JwtPayload {
  userId: string;
  role: string;
  iat?: number;
  exp?: number;
}

const JWT_SECRET = process.env.JWT_SECRET as string;

export const verifyToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      throw new AppError("Token đã hết hạn", 401);
    }
    throw new AppError("Token không hợp lệ", 401);
  }
};