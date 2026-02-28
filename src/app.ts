// app.ts (Phiên bản hoàn chỉnh và tối ưu)
import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";

// Import Global Error Handler (Giả định file này có 4 tham số: err, req, res, next)
import { globalErrorHandler } from "./middleware/errorHandler";

const app: Application = express();

// 1. Cấu hình CORS (Middleware)
const corsOptions = {
  // Luôn ưu tiên dùng biến môi trường cho domain FE trong Production
  origin: ["http://localhost:3000", "http://localhost:5173"],
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
};
app.use(cors(corsOptions));

// 2. Body Parser & Limit
app.use(express.json({ limit: "10kb" })); // Tối ưu: Giới hạn kích thước body JSON
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// 4. Xử lý Lỗi (Global Error Handling - Phải là middleware cuối cùng)
// app.use(globalErrorHandler);

export default app;
