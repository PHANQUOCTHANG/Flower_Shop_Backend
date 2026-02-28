import { EPaymentMethod } from "@/interface/order.interface";
import {
  IsEnum,
  IsNotEmpty,
  IsString,
  IsArray,
  ValidateNested,
} from "class-validator";

export class CreateOrderRequestDto {
  @IsEnum(EPaymentMethod, { message: "Phương thức thanh toán không hợp lệ" })
  @IsNotEmpty()
  paymentMethod!: EPaymentMethod;

  // Thường FE không cần gửi items nếu BE lấy trực tiếp từ Cart của User
  // Nhưng nếu bạn muốn gửi từ FE thì dùng cấu trúc này:
  @IsArray()
  @IsNotEmpty()
  items!: any[];
}
