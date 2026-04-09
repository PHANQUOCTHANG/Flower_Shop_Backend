import { Server } from "socket.io";
import { Server as HttpServer } from "http";
import { verifyToken } from "@/utils/jwt";

let io: Server;

export const initSocket = (httpServer: HttpServer) => {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
  console.log("[Socket] Initializing with CORS origin:", clientUrl);

  io = new Server(httpServer, {
    cors: {
      origin: clientUrl,
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
      console.log("[Socket Auth] User authenticated:", payload.userId);
      next();
    } catch (error) {
      console.error("[Socket Auth] Auth failed:", error);
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const { userId, role } = socket.data;

    // Order notifications room
    socket.join(`user:${userId}`);

    // Admin join inbox room để nhận thông báo tin mới từ mọi user
    if (role === "ADMIN") {
      socket.join("chat:admin");
    }

    console.log(
      `[Socket] Connected: ${userId} | role: ${role} | id: ${socket.id}`,
    );

    // User/Admin join vào room của một cuộc hội thoại cụ thể
    // Client gọi sau khi lấy được chatId từ GET /chats/me
    socket.on("chat:join", (chatId: string) => {
      if (!chatId) return;
      socket.join(`chat:${chatId}`);
      console.log(`[Socket] ${userId} joined chat room: ${chatId}`);
    });

    // Rời room chat (khi đóng cửa sổ chat)
    socket.on("chat:leave", (chatId: string) => {
      if (!chatId) return;
      socket.leave(`chat:${chatId}`);
      console.log(`[Socket] ${userId} left chat room: ${chatId}`);
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
      console.log(`[Socket] Disconnected: ${userId} | reason: ${reason}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket.io chưa được khởi tạo");
  return io;
};
