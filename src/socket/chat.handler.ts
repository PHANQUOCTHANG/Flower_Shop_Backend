// socket/chat.handler.ts
import Chat from "@/models/chat.model"; // Giả định alias và Model Chat
import { IChatDocument, IMessageData } from "@/interface/chat.interface";
import { Server, Socket } from "socket.io";

// Mở rộng socket để thêm các hàm lắng nghe sự kiện
interface ClientSocket extends Socket {
    // Thêm các thuộc tính tùy chỉnh nếu cần (ví dụ: userId)
    // userId?: string;
}

/**
 * Hàm khởi tạo Socket.IO Server và xử lý các sự kiện chat.
 * @param io Instance của Socket.IO Server.
 */
const chatHandler = (io: Server) => {
    
    // Sự kiện khi có client kết nối
    io.on("connection", (socket: ClientSocket) => {
        console.log("A user connected:", socket.id);

        // Lắng nghe sự kiện "send_message" từ client
        socket.on("send_message", async (data: IMessageData) => {
            console.log("Message received from", data.userId);
            
            // 1. Lưu tin nhắn vào DB
            // Đảm bảo dữ liệu đầu vào khớp với Model
            const chatDocument: IChatDocument = new Chat(data);
            
            try {
                await chatDocument.save();

                // 2. Gửi tin nhắn đến tất cả các client (Broadcast)
                // Chú ý: Trả về dữ liệu đã được DB gán createdAt/timestamps
                const responseData = { 
                    ...data, 
                    _id: chatDocument._id.toString(),
                    createdAt: chatDocument.createdAt,
                    role: chatDocument.role 
                };
                
                io.emit("receive_message", responseData);

            } catch (error) {
                console.error("Error saving chat message:", error);
                // Tùy chọn: Gửi lại lỗi cho client gửi tin nhắn
                socket.emit("messageterror", { message: "Failed to save message." });
            }
        });

        // Sự kiện khi client ngắt kết nối
        socket.on("disconnect", () => {
            console.log("A user disconnected:", socket.id);
        });
    });
};

export default chatHandler;