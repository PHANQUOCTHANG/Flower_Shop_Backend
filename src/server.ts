import "dotenv/config";
import "reflect-metadata";

import app from "@/app";
import clientRoute from "@/api/v1/routes/index.route";
import { globalErrorHandler } from "@/middleware/errorHandler";
import cookieParser from "cookie-parser";
import express from "express";
import { connectRedis } from "@/config/redis";
import "@/config/cloudinary";

import http from "http";
import { initSocket } from "@/config/socket";
import { startOrderWorker } from "@/module/order/order.worker";
import { setupSwagger } from "@/config/swagger";
import logger from "@/utils/logger";

const PORT = process.env.PORT || 5000;

// ─── Process-level Error Handlers ─────────────────────────────────────────────
// Bắt Promise bị reject mà không có .catch() — ngăn Node.js crash
process.on("unhandledRejection", (reason: unknown) => {
  logger.error("[Process] Unhandled Promise Rejection:", reason);
  // Không exit — server tiếp tục chạy, chỉ log
});

// Bắt lỗi đồng bộ không được try-catch — ngăn Node.js crash
process.on("uncaughtException", (err: Error) => {
  logger.error("[Process] Uncaught Exception:", err);
  // Lỗi này nghiêm trọng hơn — exit sau 1 giây để logger flush xong
  setTimeout(() => process.exit(1), 1000);
});

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Swagger
setupSwagger(app);

// Routes
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

clientRoute(app);

// Global Error Handler
app.use(globalErrorHandler);

async function startServer() {
  // 1. Connect Redis — nếu Upstash hết quota thì chỉ log warn, không crash app
  try {
    await connectRedis();
  } catch (err) {
    logger.warn("[Server] Redis không khả dụng khi khởi động, hệ thống chạy không có cache:", err);
  }

  // 2. Tạo http server và khởi động socket + worker sau
  const httpServer = http.createServer(app);
  initSocket(httpServer);
  startOrderWorker();

  // 3. Listen trên httpServer thay vì app.listen
  httpServer.listen(PORT, () => {
    logger.info(`⚡ Server running at http://localhost:${PORT}`);
  });
}

startServer();
