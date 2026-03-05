import "dotenv/config";
import "reflect-metadata";

import app from "@/app";
import clientRoute from "@/api/v1/routes/index.route";
import { globalErrorHandler } from "@/middleware/errorHandler";
import cookieParser from "cookie-parser";
import express from "express";

const PORT = process.env.PORT || 8000;

// Body parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Cookie parser
app.use(cookieParser());

// Routes
clientRoute(app);

// Global Error Handler
app.use(globalErrorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`⚡ Server running at http://localhost:${PORT}`);
});