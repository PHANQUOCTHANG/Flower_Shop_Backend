import { PrismaClient } from "@prisma/client";
import type { Address } from "@prisma/client";
import type {
  CreateAddressRequest,
  UpdateAddressRequest,
} from "./address.request";

export interface IAddressRepository {
  findByUserId(userId: string, limit?: number): Promise<Address[]>;
  findById(id: string): Promise<Address | null>;
  create(userId: string, data: CreateAddressRequest): Promise<Address>;
  update(
    id: string,
    userId: string,
    data: UpdateAddressRequest,
  ): Promise<Address>;
  delete(id: string): Promise<void>;
  setDefault(id: string, userId: string): Promise<Address>;
  belongsToUser(id: string, userId: string): Promise<boolean>;
}

export class AddressRepository implements IAddressRepository {
  constructor(private readonly prisma: PrismaClient) {}
  // Lấy tất cả địa chỉ của một người dùng (sắp xếp default trước)
  async findByUserId(userId: string, limit?: number ): Promise<Address[]> {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: { isDefault: "desc" },
      take: limit,
    });
  }

  // Lấy một địa chỉ theo ID
  async findById(id: string): Promise<Address | null> {
    return this.prisma.address.findUnique({
      where: { id },
    });
  }

  // Tạo mới một địa chỉ (nếu isDefault=true, tự động bỏ default của các cái khác)
  async create(userId: string, data: CreateAddressRequest): Promise<Address> {
    // Nếu địa chỉ mới được set làm default, bỏ default từ các địa chỉ khác
    if (data.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.address.create({
      data: {
        userId,
        name: data.name,
        phone: data.phone,
        provinceCode: data.provinceCode,
        provinceName: data.provinceName,
        districtCode: data.districtCode,
        districtName: data.districtName,
        wardCode: data.wardCode,
        wardName: data.wardName,
        streetDetail: data.streetDetail,
        isDefault: data.isDefault || false,
      },
    });
  }

  // Cập nhật một địa chỉ (nếu isDefault=true, tự động bỏ default của các cái khác)
  async update(
    id: string,
    userId: string,
    data: UpdateAddressRequest,
  ): Promise<Address> {
    // Nếu địa chỉ được cập nhật set làm default, bỏ default từ các địa chỉ khác
    if (data.isDefault === true) {
      await this.prisma.address.updateMany({
        where: { userId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    // Build update data chỉ với những field được cung cấp
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.provinceCode !== undefined)
      updateData.provinceCode = data.provinceCode;
    if (data.provinceName !== undefined)
      updateData.provinceName = data.provinceName;
    if (data.districtCode !== undefined)
      updateData.districtCode = data.districtCode;
    if (data.districtName !== undefined)
      updateData.districtName = data.districtName;
    if (data.wardCode !== undefined) updateData.wardCode = data.wardCode;
    if (data.wardName !== undefined) updateData.wardName = data.wardName;
    if (data.streetDetail !== undefined)
      updateData.streetDetail = data.streetDetail;
    if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;

    return this.prisma.address.update({
      where: { id },
      data: updateData,
    });
  }

  // Xóa một địa chỉ
  async delete(id: string): Promise<void> {
    await this.prisma.address.delete({
      where: { id },
    });
  }

  // Đặt một địa chỉ làm mặc định (tự động bỏ default của các cái khác)
  async setDefault(id: string, userId: string): Promise<Address> {
    // Bỏ default của tất cả địa chỉ khác của user
    await this.prisma.address.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });

    // Đặt địa chỉ này thành mặc định
    return this.prisma.address.update({
      where: { id },
      data: { isDefault: true },
    });
  }

  // Kiểm tra xem địa chỉ có thuộc về user không (dùng cho permission check)
  async belongsToUser(id: string, userId: string): Promise<boolean> {
    const address = await this.prisma.address.findUnique({
      where: { id },
    });
    return address?.userId === userId;
  }
}
