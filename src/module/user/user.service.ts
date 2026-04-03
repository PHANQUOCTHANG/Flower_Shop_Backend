import bcrypt from "bcrypt";
import AppError from "@/utils/appError";
import { IUserRepository } from "@/module/user/user.repository";
import { UserResponseDto } from "@/module/user/user.response";
import {
  UpdateUserRequestDto,
  CreateUserRequestDto,
} from "@/module/user/user.request";
import {
  getCache,
  setCache,
  deleteCache,
  deleteCacheByPattern,
} from "@/utils/cache";

export interface IUserService {
  create(dto: CreateUserRequestDto): Promise<UserResponseDto>;
  findAll(query?: any): Promise<any>;
  findById(id: string): Promise<UserResponseDto>;
  update(id: string, dto: UpdateUserRequestDto): Promise<UserResponseDto>;
  delete(id: string): Promise<void>;
}

export class UserService implements IUserService {
  private readonly CACHE_KEY = "users";
  private readonly CACHE_TTL_LIST = 600; // 10 phút - danh sách user (ít thay đổi)
  private readonly CACHE_TTL_DETAIL = 900; // 15 phút - chi tiết user (rất ít thay đổi)

  constructor(private readonly userRepo: IUserRepository) {}

  // Tạo người dùng mới
  async create(dto: CreateUserRequestDto): Promise<UserResponseDto> {
    // Kiểm tra email đã tồn tại
    const existed = await this.userRepo.findByEmail(dto.email);
    if (existed) throw new AppError("Email đã tồn tại", 409);

    // Hash mật khẩu (nếu có)
    const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, 10)
      : undefined;

    // Tạo user mới
    const user = await this.userRepo.create({
      ...dto,
      password: passwordHash,
    });

    // Xóa cache danh sách (user mới được thêm)
    await deleteCacheByPattern(`${this.CACHE_KEY}:list:*`);

    return UserResponseDto.from(user);
  }

  // Lấy danh sách người dùng (phân trang, tìm kiếm, lọc)
  async findAll(query: any): Promise<any> {
    // Tạo cache key từ query parameters
    const cacheKey = `${this.CACHE_KEY}:list:${JSON.stringify(query)}`;
    const cached = await getCache<any>(cacheKey);
    if (cached) return cached;

    // Lấy từ DB
    const result = await this.userRepo.findAll(query);
    const response = {
      ...result,
      data: UserResponseDto.fromList(result.data),
    };

    // Lưu cache (10 phút - danh sách user ít thay đổi)
    await setCache(cacheKey, response, this.CACHE_TTL_LIST);

    return response;
  }

  // Lấy chi tiết người dùng theo ID
  async findById(id: string): Promise<UserResponseDto> {
    // Kiểm tra cache trước
    const cacheKey = `${this.CACHE_KEY}:id:${id}`;
    const cached = await getCache<UserResponseDto>(cacheKey);
    if (cached) return cached;

    // Lấy từ DB
    const user = await this.userRepo.findById(id);
    if (!user) throw new AppError("Không tìm thấy người dùng", 404);

    const response = UserResponseDto.from(user);

    // Lưu cache (15 phút - chi tiết user rất ít thay đổi)
    await setCache(cacheKey, response, this.CACHE_TTL_DETAIL);

    return response;
  }

  // Cập nhật thông tin người dùng
  async update(
    id: string,
    dto: UpdateUserRequestDto,
  ): Promise<UserResponseDto> {
    // Kiểm tra người dùng có tồn tại
    const exists = await this.userRepo.findById(id);
    if (!exists) throw new AppError("Người dùng không tồn tại", 404);

    const updateData: any = { ...dto };

    // Hash mật khẩu mới (nếu có)
    if (dto.password) {
      updateData.password = await bcrypt.hash(dto.password, 10);
    }

    // Cập nhật user
    const updated = await this.userRepo.updateById(id, updateData);
    if (!updated) throw new AppError("Cập nhật thất bại", 500);

    // Xóa cache liên quan
    await Promise.all([
      deleteCache(`${this.CACHE_KEY}:id:${id}`), // Cache chi tiết ID
      deleteCacheByPattern(`${this.CACHE_KEY}:list:*`), // Cache danh sách
    ]);

    return UserResponseDto.from(updated);
  }

  // Xóa mềm người dùng
  async delete(id: string): Promise<void> {
    // Kiểm tra người dùng có tồn tại
    const exists = await this.userRepo.findById(id);
    if (!exists) throw new AppError("Người dùng không tồn tại để xóa", 404);

    // Đánh dấu xóa mềm
    await this.userRepo.softDelete(id);

    // Xóa cache liên quan
    await Promise.all([
      deleteCache(`${this.CACHE_KEY}:id:${id}`), // Cache chi tiết ID
      deleteCacheByPattern(`${this.CACHE_KEY}:list:*`), // Cache danh sách (bị ảnh hưởng bởi xóa)
    ]);
  }
}
