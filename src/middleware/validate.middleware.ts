import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError, ZodIssue } from "zod";
import AppError from "@/utils/appError";

const validationMiddleware =
  (schema: ZodSchema, part: "body" | "params" | "query" = "body") =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate dữ liệu và sanitize (loại bỏ trường không cần thiết, format lại dữ liệu)
      const parsed = await schema.parseAsync(req[part]);

      // Express 5 định nghĩa req.query là getter-only (Object.defineProperty với
      // configurable: true nhưng không có setter) — gán trực tiếp req.query = ...
      // ném "Cannot set property query of #<IncomingMessage> which has only a
      // getter". req.body/req.params vẫn là property thường nên gán trực tiếp được.
      if (part === "query") {
        Object.defineProperty(req, "query", {
          value: parsed,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      } else {
        req[part] = parsed;
      }

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