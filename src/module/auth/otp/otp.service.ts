import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import AppError from "@/utils/appError";
import { IOtpRepository } from "@/module/auth/otp/otp.repository";
import { IUserRepository } from "@/module/user/user.repository";
import { emailService } from "@/config/container";
import { OtpSentResponseDto, OtpVerifiedResponseDto } from "./otp.response";
import { getCache, setCache, deleteCache } from "@/utils/cache";

export interface IOtpService {
  send(email: string): Promise<OtpSentResponseDto>;
  verify(email: string, otp: string): Promise<OtpVerifiedResponseDto>;
}

export class OtpService implements IOtpService {
  private readonly CACHE_KEY_PREFIX = "otp:";
  private readonly OTP_TTL = 300; // 5 phút (tương ứng với logic của bạn)

  constructor(
    private readonly otpRepo: IOtpRepository,
    private readonly userRepo: IUserRepository,
  ) {}

  // Tạo, lưu trữ OTP và gửi qua email cho người dùng
  async send(email: string): Promise<OtpSentResponseDto> {
    // 1. Kiểm tra tài khoản có tồn tại để tránh gửi mail rác
    const user = await this.userRepo.findByEmail(email);
    if (!user) throw new AppError("Email không tồn tại trên hệ thống.", 404);

    // 2. Tạo mã 6 số ngẫu nhiên và băm mật mã để lưu trữ bảo mật
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + this.OTP_TTL * 1000); // Hiệu lực trong 5 phút

    // 3. Dọn dẹp tất cả các mã cũ của email này trước khi tạo mới
    // [Cache] Redis setCache với cùng một key sẽ tự động ghi đè mã cũ
    const cacheKey = `${this.CACHE_KEY_PREFIX}${email}`;

    // 4. Ghi nhận mã OTP mới vào cơ sở dữ liệu (Hoặc Redis)
    // Ở đây ta lưu OTP vào Redis thay vì DB để tăng tốc độ và tự động hết hạn
    await setCache(cacheKey, { otpHash, email }, this.OTP_TTL);

    // Lưu song song vào Repo nếu bạn vẫn muốn giữ lịch sử trong DB (optional)
    await this.otpRepo.deleteByEmail(email);
    await this.otpRepo.create({
      email,
      otpHash,
      expiresAt,
    });

    // 5. Gửi email thực tế (Hủy OTP trong DB/Cache nếu nhà cung cấp email lỗi)
    try {
      await emailService.sendOtp(email, otp);
      return new OtpSentResponseDto(expiresAt);
    } catch (error) {
      // [Cache] Xóa cache nếu gửi mail thất bại
      await deleteCache(cacheKey);
      await this.otpRepo.deleteByEmail(email);
      throw new AppError("Không thể gửi email OTP, vui lòng thử lại sau.", 500);
    }
  }

  // Xác thực mã OTP và cấp mã Token tạm thời để đặt lại mật khẩu
  async verify(email: string, otp: string): Promise<OtpVerifiedResponseDto> {
    // 1. Truy vấn mã OTP mới nhất và còn hạn sử dụng
    // [Cache] Lấy từ Redis trước để đạt tốc độ tối đa
    const cacheKey = `${this.CACHE_KEY_PREFIX}${email}`;
    const cachedRecord = await getCache<{ otpHash: string; email: string }>(
      cacheKey,
    );

    // Nếu không có trong cache, kiểm tra lại trong DB (đề phòng Redis restart hoặc fallback)
    let record = cachedRecord;
    if (!record) {
      const dbRecord = await this.otpRepo.findValidByEmail(email);
      if (!dbRecord) {
        throw new AppError("Mã OTP đã hết hạn hoặc không tồn tại.", 400);
      }
      record = { otpHash: dbRecord.otpHash, email: dbRecord.email };
    }

    // 2. Kiểm tra tính chính xác của mã OTP người dùng nhập vào
    const isValid = await bcrypt.compare(otp, record.otpHash);
    if (!isValid) throw new AppError("Mã OTP không chính xác.", 400);

    // 3. Đánh dấu mã đã xác thực để không thể tái sử dụng
    // [Cache] Xóa OTP ngay sau khi verify thành công
    await deleteCache(cacheKey);

    // Đồng bộ trạng thái với DB nếu dùng Repo
    const dbRecordFull = await this.otpRepo.findValidByEmail(email);
    if (dbRecordFull) await this.otpRepo.markVerified(dbRecordFull.id);

    // 4. Lấy thông tin user hiện tại để đưa vào Token
    const user = await this.userRepo.findByEmail(email);
    if (!user) throw new AppError("Người dùng không còn tồn tại.", 404);

    // 5. Tạo Reset Token (JWT) có thời hạn ngắn để thực hiện bước đổi pass
    const resetSecret = process.env.JWT_RESET_SECRET;
    if (!resetSecret) throw new AppError("Lỗi cấu hình bảo mật hệ thống.", 500);

    const resetToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        scope: "reset_password",
      },
      resetSecret,
      { expiresIn: "15m" },
    );

    return new OtpVerifiedResponseDto(resetToken);
  }
}
