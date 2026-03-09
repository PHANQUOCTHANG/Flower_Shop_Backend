import { 
  IsString, 
  IsNotEmpty, 
  IsNumber, 
  Min, 
  Max, 
  IsMongoId, 
  IsOptional, 
  MaxLength, 
  IsArray 
} from "class-validator";

export class CreateReviewRequestDto {
  @IsMongoId({ message: "ID sản phẩm không hợp lệ" })
  @IsNotEmpty({ message: "Sản phẩm không được để trống" })
  product!: string;

  @IsNumber({}, { message: "Điểm đánh giá phải là số" })
  @Min(1, { message: "Điểm đánh giá thấp nhất là 1" })
  @Max(5, { message: "Điểm đánh giá cao nhất là 5" })
  rating!: number;

  @IsString({ message: "Bình luận phải là chuỗi ký tự" })
  @MaxLength(500, { message: "Bình luận không được vượt quá 500 ký tự" })
  @IsOptional()
  comment?: string;

  @IsArray({ message: "Danh sách hình ảnh phải là mảng" })
  @IsString({ each: true, message: "Mỗi đường dẫn ảnh phải là chuỗi" })
  @IsOptional()
  images?: string[];
}