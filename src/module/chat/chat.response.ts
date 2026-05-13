export class MessageResponseDto {
  id: string;
  chatId: string;
  senderId: string;
  senderRole: string;
  content: string | null;
  mediaUrl: string | null;
  mediaPublicId: string | null;
  mediaType: string | null;
  mediaName: string | null;
  mediaSize: number | null;
  createdAt: string;
  isRead: boolean;

  constructor(data: any) {
    this.id = data.id;
    this.chatId = data.chatId;
    this.senderId = data.senderId;
    this.senderRole = data.senderRole;
    this.content = data.content ?? null;
    this.mediaUrl = data.mediaUrl ?? null;
    this.mediaPublicId = data.mediaPublicId ?? null;
    this.mediaType = data.mediaType ?? null;
    this.mediaName = data.mediaName ?? null;
    this.mediaSize = data.mediaSize ?? null;
    this.createdAt = data.createdAt.toISOString();
    this.isRead = data.isRead;
  }

  static from(data: any) {
    return new MessageResponseDto(data);
  }

  static fromList(list: any[]) {
    return list.map((item) => new MessageResponseDto(item));
  }
}

export class ChatResponseDto {
  id: string;
  userId: string;
  status: string;
  lastMessageAt: string | null;
  user?: any;
  lastMessage?: {
    content: string;
    createdAt: string;
    senderRole?: string;
    isRead?: boolean;
    mediaUrl?: string | null;
    mediaType?: string | null;
  } | null;

  constructor(data: any) {
    this.id = data.id;
    this.userId = data.userId;
    this.status = data.status;
    this.lastMessageAt = data.lastMessageAt?.toISOString() || null;
    this.user = data.user
      ? { fullName: data.user.fullName, avatarUrl: data.user.avatarUrl }
      : null;
    this.lastMessage = data.messages?.[0]
      ? {
          content: data.messages[0].content,
          createdAt: data.messages[0].createdAt,
          senderRole: data.messages[0].senderRole,
          isRead: data.messages[0].isRead,
          mediaUrl: data.messages[0].mediaUrl,
          mediaType: data.messages[0].mediaType,
        }
      : null;
  }

  static from(data: any) {
    return new ChatResponseDto(data);
  }

  static fromList(list: any[]) {
    return list.map((item) => new ChatResponseDto(item));
  }
}
