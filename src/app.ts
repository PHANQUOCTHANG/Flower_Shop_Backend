// app.ts (Phiên bản hoàn chỉnh và tối ưu)
import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";



const app: Application = express();

// 1. Cấu hình CORS (Middleware)
const corsOptions = {
  // Luôn ưu tiên dùng biến môi trường cho domain FE trong Production
  origin: ["http://localhost:3000", "http://localhost:5173"],
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
};
app.use(cors(corsOptions));


export default app;
