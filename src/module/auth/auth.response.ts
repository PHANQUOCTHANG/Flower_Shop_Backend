export interface IAuthResponseDto {
  accessToken: string;     // JWT ngắn hạn để truy cập API
  refreshToken: string;    // JWT dài hạn để làm mới access token

  user: {
    id: string;            // user._id đã map sang string
    fullName: string;
    email: string;
    role: "ADMIN" | "STAFF" | "CUSTOMER";
  };
}
