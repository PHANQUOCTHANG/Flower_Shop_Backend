import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsMongoId,
  IsOptional,
} from "class-validator";

// DTO khi người dùng nhấn "Thêm vào giỏ hàng"
export class AddToCartRequestDto {
  @IsMongoId({ message: "Mã sản phẩm (productId) không hợp lệ" })
  @IsNotEmpty({ message: "Sản phẩm không được để trống" })
  productId!: string;

  @IsNumber({}, { message: "Số lượng phải là một con số" })
  @Min(1, { message: "Số lượng tối thiểu là 1" })
  quantity!: number;

  @IsString()
  @IsNotEmpty({ message: "Vui lòng chọn màu sắc sản phẩm" })
  color!: string;

  @IsString()
  @IsNotEmpty({ message: "Vui lòng chọn kích cỡ sản phẩm" })
  size!: string;

  @IsMongoId({ message: "User ID không hợp lệ" })
  @IsOptional()
  userId?: string;
}

// DTO khi người dùng cập nhật số lượng hoặc xóa sản phẩm
export class UpdateCartItemDto {
  @IsMongoId({ message: "Mã sản phẩm không hợp lệ" })
  productId!: string;

  @IsString()
  color!: string;

  @IsString()
  size!: string;

  // Dùng cho trường hợp cập nhật số lượng trực tiếp
  @IsNumber()
  @Min(0) // Nếu bằng 0 có thể coi như xóa
  quantity?: number;

  @IsMongoId({ message: "User ID không hợp lệ" })
  @IsOptional()
  userId?: string;
}
