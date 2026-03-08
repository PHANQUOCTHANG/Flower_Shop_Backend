import bcrypt from "bcrypt";
import AppError from "@/utils/appError";
import { IUserRepository } from "@/module/user/user.repository";
import { UserResponseDto } from "@/module/user/user.response";
import {
  UpdateUserRequestDto,
  CreateUserRequestDto,
} from "@/module/user/user.request";

export interface IUserService {
  create(dto: CreateUserRequestDto): Promise<UserResponseDto>;
  findAll(query?: any): Promise<any>;
  findById(id: string): Promise<UserResponseDto>;
  update(id: string, dto: UpdateUserRequestDto): Promise<UserResponseDto>;
  delete(id: string): Promise<void>;
}

export class UserService implements IUserService {
  constructor(private readonly userRepo: IUserRepository) {}

  // Tạo user
  async create(dto: CreateUserRequestDto): Promise<UserResponseDto> {
    const existed = await this.userRepo.findByEmail(dto.email);
    if (existed) throw new AppError("Email đã tồn tại", 409);

    const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, 10)
      : undefined;

    const user = await this.userRepo.create({
      ...dto,
      password: passwordHash,
    });

    return UserResponseDto.from(user);
  }

  // Lấy danh sách
  async findAll(query: any) {
    const result = await this.userRepo.findAll(query);
    return {
      ...result,
      data: UserResponseDto.fromList(result.data),
    };
  }

  // Lấy chi tiết
  async findById(id: string) {
    const user = await this.userRepo.findById(id);
    if (!user) throw new AppError("Không tìm thấy người dùng", 404);

    return UserResponseDto.from(user);
  }

  // Cập nhật
  async update(id: string, dto: UpdateUserRequestDto) {
    const exists = await this.userRepo.findById(id);
    if (!exists) throw new AppError("Người dùng không tồn tại", 404);

    const updateData: any = { ...dto };

    if (dto.password) {
      updateData.password = await bcrypt.hash(dto.password, 10);
    }

    const updated = await this.userRepo.updateById(id, updateData);
    if (!updated) throw new AppError("Cập nhật thất bại", 500);

    return UserResponseDto.from(updated);
  }

  // Xóa mềm
  async delete(id: string) {
    const exists = await this.userRepo.findById(id);
    if (!exists) throw new AppError("Người dùng không tồn tại để xóa", 404);

    await this.userRepo.softDelete(id);
  }
}
