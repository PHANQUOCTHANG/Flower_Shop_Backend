// app.ts (Phiên bản hoàn chỉnh và tối ưu)
import express, { Application } from "express";
import cors from "cors";



const app: Application = express();

// 1. Cấu hình CORS (Middleware)
// Cấu hình CORS đọc từ biến môi trường — tránh hardcode localhost
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:3000", "http://localhost:5173"];

const corsOptions = {
  origin: allowedOrigins,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
};
app.use(cors(corsOptions));


export default app;
