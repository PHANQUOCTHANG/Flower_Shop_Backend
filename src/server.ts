import "dotenv/config"; // Load env variables FIRST
import "reflect-metadata";
import express, { Request, Response } from "express";
import clientRoute from "@/api/v1/routes/index.route";
import app from "@/app";
import { globalErrorHandler } from "@/middleware/errorHandler";

// constant .
const PORT = process.env.PORT || 8000;

// router .
clientRoute(app);

// global error .
app.use(globalErrorHandler);

// Khởi động máy chủ
app.listen(PORT, () => {
  console.log(`⚡️ [server]: Máy chủ đang chạy tại http://localhost:${PORT}`);
});
