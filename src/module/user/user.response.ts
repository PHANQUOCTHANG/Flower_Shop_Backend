import { User, UserRole, AuthProvider } from "@prisma/client";

// DTO trả về cho client (không expose password)
export class UserResponseDto {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  avatar: string | null;
  status: "ACTIVE" | "INACTIVE";
  emailVerified: boolean;
  provider: AuthProvider;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;

  constructor(user: User) {
    this.id = user.id;
    this.fullName = user.fullName;
    this.email = user.email;
    this.phone = user.phone;
    this.role = user.role;
    this.avatar = user.avatar;
    this.status = user.isActive ? "ACTIVE" : "INACTIVE";
    this.emailVerified = user.emailVerified;
    this.provider = user.provider;
    this.lastLogin = user.lastLogin?.toISOString() ?? null;
    this.createdAt = user.createdAt.toISOString();
    this.updatedAt = user.updatedAt.toISOString();
  }

  // Chuyển đổi một user thành DTO
  static from(user: User): UserResponseDto {
    return new UserResponseDto(user);
  }

  // Chuyển đổi danh sách users thành DTO
  static fromList(users: User[]): UserResponseDto[] {
    return users.map((u) => new UserResponseDto(u));
  }
}
