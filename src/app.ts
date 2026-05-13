// app.ts (Phiên bản hoàn chỉnh và tối ưu)
import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import { globalRateLimiter } from "./middleware/rateLimiter.middleware";

const app: Application = express();

// Set trust proxy if running behind reverse proxy (e.g. Nginx, Render)
app.set("trust proxy", 1);

// 1. Helmet — bảo vệ HTTP headers (đặt trước CORS)
app.use(helmet());

// 2. Global Rate Limiter - Bảo vệ cơ bản
app.use("/api", globalRateLimiter);

// 3. Cấu hình CORS (Middleware)
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
