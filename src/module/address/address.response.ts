import { Address } from "@prisma/client";

export interface AddressResponse {
  id: string;
  userId: string;
  name: string;
  phone: string;
  provinceCode: string;
  provinceName: string;
  districtCode: string;
  districtName: string;
  wardCode: string;
  wardName: string;
  streetDetail: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const toAddressResponse = (address: Address): AddressResponse => {
  return {
    id: address.id,
    userId: address.userId,
    name: address.name,
    phone: address.phone,
    provinceCode: address.provinceCode,
    provinceName: address.provinceName,
    districtCode: address.districtCode,
    districtName: address.districtName,
    wardCode: address.wardCode,
    wardName: address.wardName,
    streetDetail: address.streetDetail,
    isDefault: address.isDefault,
    createdAt: address.createdAt,
    updatedAt: address.updatedAt,
  };
};
