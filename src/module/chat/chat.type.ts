export interface IChatSocket {
  /**
   * Gửi tin nhắn mới tới tất cả thành viên trong phòng chat
   */
  emitNewMessage(chatId: string, message: any): void;

  /**
   * Thông báo trạng thái tin nhắn đã được đọc
   */
  emitMessagesRead(chatId: string, readerRole: string): void;
}