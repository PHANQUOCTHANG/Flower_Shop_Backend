import { JwtPayload as DefaultJwtPayload } from "jsonwebtoken";

// Định nghĩa cấu trúc Payload của bạn
export interface JwtPayload extends DefaultJwtPayload {
  userId: string;
  email?: string;
  role: string;
}

// Mở rộng interface Request của Express
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      // Thêm dòng dưới đây để sửa lỗi 'Property file does not exist' của Multer nếu cần
      file?: Express.Multer.File;
      files?: Express.Multer.File[];
    }
  }
}

// Bắt buộc phải có dòng này để file được coi là một module
export {};