import { Request, Response, NextFunction } from "express";
import AppError from "@/utils/appError";
import logger from "@/utils/logger";
import { Prisma } from "@prisma/client";

export interface IGlobalError extends Error {
  statusCode?: number;
  status?: string;
  isOperational?: boolean;
  details?: string[];
}

// Ánh xạ lỗi Prisma → AppError có message thân thiện
function handlePrismaError(err: any): AppError {
  // P2002: Unique constraint (VD: email đã tồn tại)
  if (err.code === "P2002") {
    const field = err.meta?.target?.[0] ?? "trường dữ liệu";
    return new AppError(`Giá trị của ${field} đã tồn tại trong hệ thống`, 409);
  }
  // P2025: Record not found
  if (err.code === "P2025") {
    return new AppError("Không tìm thấy dữ liệu yêu cầu", 404);
  }
  // P2003: Foreign key constraint
  if (err.code === "P2003") {
    return new AppError("Dữ liệu liên kết không hợp lệ hoặc đã bị xóa", 400);
  }
  // P2014: Relation violation
  if (err.code === "P2014") {
    return new AppError("Vi phạm ràng buộc quan hệ dữ liệu", 400);
  }
  return new AppError("Lỗi cơ sở dữ liệu, vui lòng thử lại", 500, false);
}

export function globalErrorHandler(
  err: IGlobalError,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  let error: IGlobalError = err;

  // Prisma Known Error
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    error = handlePrismaError(err);
  }
  // Prisma Validation Error
  else if (err instanceof Prisma.PrismaClientValidationError) {
    error = new AppError("Dữ liệu gửi lên không hợp lệ", 400);
  }
  // Chuẩn hoá lỗi không xác định thành AppError
  else if (!(err instanceof AppError)) {
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

  const statusCode = error.statusCode || 500;
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
    message: error.isOperational ? error.message : "Lỗi hệ thống, vui lòng thử lại sau!",
    ...(error.details && { details: error.details }),
  });
}
