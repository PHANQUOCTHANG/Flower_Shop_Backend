import { Request, Response, NextFunction } from "express";
import AppError from "@/utils/appError";
import logger from "@/utils/logger";

export interface IGlobalError extends Error {
  statusCode?: number;
  status?: string;
  isOperational?: boolean;
  details?: string[];
}

export function globalErrorHandler(
  err: IGlobalError,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  let error = err;

  // Chuẩn hoá lỗi không xác định thành AppError
  if (!(err instanceof AppError)) {
    error = new AppError(
      err.message || "Internal Server Error",
      err.statusCode || 500,
      false
    );
  }

  // Chỉ log lỗi server / lỗi không kiểm soát
  if ((error.statusCode && error.statusCode >= 500) || !error.isOperational) {
    logger.error(error);
  }

  const statusCode = error.statusCode || 200; 
  const isDev = process.env.NODE_ENV === "development";

  // DEV: trả full thông tin để debug
  if (isDev) {
    return res.status(statusCode).json({
      success: false,
      statusCode,
      message: error.message,
      details: error.details,
      stack: error.stack,
    });
  }

  // PROD: chỉ trả lỗi an toàn
  res.status(statusCode).json({
    success: false,
    statusCode,
    message: error.isOperational ? error.message : "Internal Server Error",
    ...(error.details && { details: error.details }),
  });
}
