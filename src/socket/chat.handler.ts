// import { IChatSocket } from "@/module/chat/chat.type";
// import { Server, Socket } from "socket.io";

// export class ChatSocket implements IChatSocket {
//   private static io: Server;

//   constructor(io: Server) {
//     ChatSocket.io = io;
//     this.initEvents();
//   }

//   private initEvents() {
//     ChatSocket.io.on("connection", (socket: Socket) => {
//       // Client tham gia vào phòng chat cụ thể khi mở khung chat
//       socket.on("join_chat", (chatId: string) => {
//         socket.join(chatId);
//         console.log(`Socket ${socket.id} joined room: ${chatId}`);
//       });

//       socket.on("disconnect", () => {
//         console.log(`Socket ${socket.id} disconnected`);
//       });
//     });
//   }

//   emitNewMessage(chatId: string, message: any): void {
//     ChatSocket.io.to(chatId).emit("new_message", message);
//   }

//   emitMessagesRead(chatId: string, readerRole: string): void {
//     ChatSocket.io.to(chatId).emit("messages_read", { chatId, readerRole });
//   }
// }