export interface IEmailData {
  to: string;
  subject: string;
  body: string; // Nội dung HTML/Text
  name?: string; // Tên người dùng để cá nhân hóa
  verificationLink?: string; // Link xác minh (nếu là email xác minh)
}