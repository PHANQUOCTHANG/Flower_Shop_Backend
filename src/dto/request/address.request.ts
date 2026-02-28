import { IsBoolean, IsNotEmpty, IsString } from "class-validator";

export class AddressRequestDto {
  @IsString({ message: "Tên người nhận phải là chuỗi" })
  @IsNotEmpty({ message: "Tên người nhận không được để trống" })
  receiverName!: string;

  @IsString({ message: "Số điện thoại phải là chuỗi" })
  @IsNotEmpty({ message: "Số điện thoại không được để trống" })
  phone!: string;

  @IsString({ message: "Địa chỉ phải là chuỗi" })
  @IsNotEmpty({ message: "Địa chỉ không được để trống" })
  address!: string;

  @IsBoolean({ message: "isDefault phải là true hoặc false" })
  isDefault!: boolean;
}
