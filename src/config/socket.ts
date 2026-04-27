import { Server } from "socket.io";
import { Server as HttpServer } from "http";
import { verifyToken } from "@/utils/jwt";
import logger from "@/utils/logger";

let io: Server;

export const initSocket = (httpServer: HttpServer) => {
  const allowedOrigins = process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(",").map((o) => o.trim())
    : ["http://localhost:3000", "http://localhost:5173", "https://flower-jade-delta.vercel.app"];

  logger.info(`[Socket] Initializing with CORS origins: ${allowedOrigins.join(", ")}`);

  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
      methods: ["GET", "POST"],
      allowedHeaders: ["Authorization", "Content-Type"],
    },
    transports: ["websocket", "polling"],
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    try {
      const payload = verifyToken(token);
      socket.data.userId = payload.userId;
      socket.data.role = payload.role;

      next();
    } catch (error) {
      logger.error(`[Socket Auth] Auth failed: ${error}`);
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const { userId, role } = socket.data;

    // Order notifications room
    socket.join(`user:${userId}`);

    // Admin join inbox room để nhận thông báo tin mới từ mọi user
    if (role === "ADMIN" || role === "admin" || role === "STAFF") {
      socket.join("chat:admin");
      logger.info(`[Socket] ${userId} (${role}) joined chat:admin room`);
    }

    logger.info(`[Socket] Connected: ${userId} | role: ${role} | id: ${socket.id}`);

    // User/Admin join vào room của một cuộc hội thoại cụ thể
    // Client gọi sau khi lấy được chatId từ GET /chats/me
    socket.on("chat:join", (chatId: string) => {
      if (!chatId) return;
      socket.join(`chat:${chatId}`);
      logger.info(`[Socket] ${userId} joined chat room: ${chatId}`);
    });

    // Rời room chat (khi đóng cửa sổ chat)
    socket.on("chat:leave", (chatId: string) => {
      if (!chatId) return;
      socket.leave(`chat:${chatId}`);
      logger.info(`[Socket] ${userId} left chat room: ${chatId}`);
    });

    // Đang nhập — không cần HTTP, socket trực tiếp là đủ
    socket.on("chat:typing", (data: { chatId: string; isTyping: boolean }) => {
      if (!data?.chatId) return;
      // Broadcast cho người còn lại trong room, không gửi lại chính mình
      socket.to(`chat:${data.chatId}`).emit("chat:typing", {
        fromUserId: userId,
        isTyping: data.isTyping,
      });
    });

    socket.on("disconnect", (reason) => {
      logger.info(`[Socket] Disconnected: ${userId} | reason: ${reason}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket.io chưa được khởi tạo");
  return io;
};
