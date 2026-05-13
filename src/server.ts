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

const PORT = process.env.PORT || 5000;

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Swagger
setupSwagger(app);

// Routes
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

clientRoute(app);

// Global Error Handler
app.use(globalErrorHandler);

async function startServer() {
  // 1. Connect redis trước
  await connectRedis();

  // 2. Tạo http server và khởi động socket + worker sau
  const httpServer = http.createServer(app);
  initSocket(httpServer);
  startOrderWorker();

  // 3. Listen trên httpServer thay vì app.listen
  httpServer.listen(PORT, () => {
    console.log(`⚡ Server running at http://localhost:${PORT}`);
  });
}

startServer();
