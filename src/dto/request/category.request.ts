import { IsString, IsNotEmpty, IsOptional, IsArray } from "class-validator";

export class CreateCategoryRequestDto {
  @IsString({ message: "Tên danh mục phải là chuỗi" })
  @IsNotEmpty({ message: "Tên danh mục không được để trống" })
  name!: string;

  @IsArray({ message: "Danh sách hình ảnh phải là mảng" })
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  image?: string;
}

export class UpdateCategoryRequestDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsArray()
  @IsOptional()
  images?: string[];

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  image?: string;
}