import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError, ZodIssue } from "zod";
import AppError from "@/utils/appError";

/**
 * Middleware để validate dữ liệu request sử dụng Zod schemas
 * @param schema - Zod schema để validate
 * @param part - Phần của request cần validate (body, params, query)
 * @returns Express middleware function
 */
const validationMiddleware =
  (schema: ZodSchema, part: "body" | "params" | "query" = "body") =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate dữ liệu và sanitize (loại bỏ trường không cần thiết, format lại dữ liệu)
      req[part] = await schema.parseAsync(req[part]);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format lỗi validation từ Zod thành định dạng dễ đọc
        const details = error.issues.map((issue: ZodIssue) =>
          `${issue.path.join(".")}: ${issue.message}`
        );

        // Return lỗi 422: Unprocessable Entity
        return next(
          new AppError("Dữ liệu đầu vào không hợp lệ", 422, true, { details })
        );
      }

      // Các lỗi khác chuyển cho Global Error Handler
      next(error);
    }
  };

export default validationMiddleware;