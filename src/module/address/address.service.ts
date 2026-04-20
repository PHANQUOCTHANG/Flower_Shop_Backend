import type { IAddressRepository } from "./address.repository";
import { toAddressResponse } from "./address.response";
import type {
  CreateAddressRequest,
  UpdateAddressRequest,
} from "./address.request";
import type { AddressResponse } from "./address.response";
import AppError from "@/utils/appError";

export interface IAddressService {
  getAddresses(userId: string): Promise<AddressResponse[]>;
  getAddress(id: string, userId: string): Promise<AddressResponse>;
  createAddress(
    userId: string,
    data: CreateAddressRequest,
  ): Promise<AddressResponse>;
  updateAddress(
    id: string,
    userId: string,
    data: UpdateAddressRequest,
  ): Promise<AddressResponse>;
  deleteAddress(id: string, userId: string): Promise<void>;
  setDefaultAddress(id: string, userId: string): Promise<AddressResponse>;
}

export class AddressService implements IAddressService {
  constructor(private readonly repository: IAddressRepository) {}

  // Lấy tất cả địa chỉ của người dùng
  async getAddresses(userId: string): Promise<AddressResponse[]> {
    const addresses = await this.repository.findByUserId(userId);
    return addresses.map(toAddressResponse);
  }

  // Lấy chi tiết một địa chỉ (với permission check)
  async getAddress(id: string, userId: string): Promise<AddressResponse> {
    // Kiểm tra quyền truy cập (địa chỉ phải thuộc về user)
    const isOwner = await this.repository.belongsToUser(id, userId);
    if (!isOwner) {
      throw new AppError("Bạn không có quyền truy cập địa chỉ này", 403);
    }

    // Kiểm tra địa chỉ có tồn tại
    const address = await this.repository.findById(id);
    if (!address) {
      throw new AppError("Địa chỉ không tồn tại", 404);
    }

    return toAddressResponse(address);
  }

  // Tạo mới một địa chỉ
  async createAddress(
    userId: string,
    data: CreateAddressRequest,
  ): Promise<AddressResponse> {
    // Validate định dạng số điện thoại (10-11 chữ số)
    if (!/^[0-9]{10,11}$/.test(data.phone.replace(/\D/g, ""))) {
      throw new AppError("Số điện thoại không hợp lệ", 400);
    }

    // Tạo địa chỉ mới (repository tự động xử lý logic default)
    const address = await this.repository.create(userId, data);
    return toAddressResponse(address);
  }

  // Cập nhật một địa chỉ (với permission check và validation)
  async updateAddress(
    id: string,
    userId: string,
    data: UpdateAddressRequest,
  ): Promise<AddressResponse> {
    // Kiểm tra quyền truy cập
    const isOwner = await this.repository.belongsToUser(id, userId);
    if (!isOwner) {
      throw new AppError("Bạn không có quyền cập nhật địa chỉ này", 403);
    }

    // Kiểm tra địa chỉ có tồn tại
    const existingAddress = await this.repository.findById(id);
    if (!existingAddress) {
      throw new AppError("Địa chỉ không tồn tại", 404);
    }

    // Validate số điện thoại nếu có cập nhật
    if (data.phone && !/^[0-9]{10,11}$/.test(data.phone.replace(/\D/g, ""))) {
      throw new AppError("Số điện thoại không hợp lệ", 400);
    }

    const address = await this.repository.update(id, userId, data);
    return toAddressResponse(address);
  }

  // Xóa một địa chỉ (với permission check)
  async deleteAddress(id: string, userId: string): Promise<void> {
    // Kiểm tra quyền truy cập
    const isOwner = await this.repository.belongsToUser(id, userId);
    if (!isOwner) {
      throw new AppError("Bạn không có quyền xóa địa chỉ này", 403);
    }

    // Kiểm tra địa chỉ có tồn tại
    const address = await this.repository.findById(id);
    if (!address) {
      throw new AppError("Địa chỉ không tồn tại", 404);
    }

    await this.repository.delete(id);
  }

  // Đặt một địa chỉ làm mặc định (repository tự động bỏ default của các cái khác)
  async setDefaultAddress(
    id: string,
    userId: string,
  ): Promise<AddressResponse> {
    // Kiểm tra quyền truy cập
    const isOwner = await this.repository.belongsToUser(id, userId);
    if (!isOwner) {
      throw new AppError("Bạn không có quyền thay đổi địa chỉ này", 403);
    }

    // Kiểm tra địa chỉ có tồn tại
    const address = await this.repository.findById(id);
    if (!address) {
      throw new AppError("Địa chỉ không tồn tại", 404);
    }

    const updatedAddress = await this.repository.setDefault(id, userId);
    return toAddressResponse(updatedAddress);
  }
}
