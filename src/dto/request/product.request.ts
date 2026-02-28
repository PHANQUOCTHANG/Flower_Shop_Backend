import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
  Max,
  IsArray,
  IsMongoId,
  IsBoolean,
  ValidateNested,
  IsNotEmpty,
} from "class-validator";
import { Type } from "class-transformer";

export class ColorRequestDto {
  @IsString({ message: "Tên màu phải là chuỗi" })
  @IsOptional()
  name?: string;

  @IsString({ message: "Mã màu phải là chuỗi" })
  @IsOptional()
  code?: string;
}

export class CreateProductRequestDto {
  @IsString({ message: "Tên sản phẩm phải là chuỗi" })
  @IsNotEmpty({ message: "Tên sản phẩm không được để trống" })
  name!: string;

  @IsNumber({}, { message: "Giá sản phẩm phải là số" })
  @Min(0, { message: "Giá sản phẩm không được nhỏ hơn 0" })
  price!: number;

  @IsString({ message: "Mô tả phải là chuỗi" })
  @IsOptional()
  description?: string;

  @IsArray({ message: "Danh sách hình ảnh phải là mảng" })
  @IsString({ each: true, message: "Mỗi hình ảnh phải là đường dẫn chuỗi" })
  @IsOptional()
  images?: string[];

  @IsNumber({}, { message: "Số lượng tồn kho phải là số" })
  @Min(0, { message: "Tồn kho không được nhỏ hơn 0" })
  @IsOptional()
  stock?: number;

  @IsEnum(['active', 'inactive', 'pending'], {
    message: "Trạng thái chỉ có thể là active, inactive hoặc pending",
  })
  @IsOptional()
  status?: 'active' | 'inactive' | 'pending';

  @IsMongoId({ message: "Danh mục không hợp lệ" })
  @IsNotEmpty({ message: "Danh mục là bắt buộc" })
  category!: string;

  @IsNumber({}, { message: "Giảm giá phải là số" })
  @Min(0)
  @Max(100)
  @IsOptional()
  discount?: number;

  @ValidateNested()
  @Type(() => ColorRequestDto)
  @IsOptional()
  color?: ColorRequestDto;

  @IsString({ message: "Kích thước phải là chuỗi" })
  @IsOptional()
  size?: string;

  @IsBoolean({ message: "productNew phải là kiểu boolean" })
  @IsOptional()
  productNew?: boolean;
}

export class UpdateProductRequestDto {
  @IsString({ message: "Tên sản phẩm phải là chuỗi" })
  @IsOptional()
  name?: string;

  @IsNumber({}, { message: "Giá sản phẩm phải là số" })
  @Min(0)
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsOptional()
  images?: string[];

  @IsNumber()
  @IsOptional()
  stock?: number;

  @IsEnum(['active', 'inactive', 'pending'])
  @IsOptional()
  status?: 'active' | 'inactive' | 'pending';

  @IsMongoId({ message: "Danh mục không hợp lệ" })
  @IsOptional()
  category?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  discount?: number;

  @ValidateNested()
  @Type(() => ColorRequestDto)
  @IsOptional()
  color?: ColorRequestDto;

  @IsString()
  @IsOptional()
  size?: string;
  
  @IsBoolean()
  @IsOptional()
  productNew?: boolean;
}