import { User, UserRole, AuthProvider } from "@prisma/client";

/**
 * DTO trả về cho client
 * Không expose password
 */
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
    this.id = user.id.toString(); // Convert bigint -> string
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

  static from(user: User) {
    return new UserResponseDto(user);
  }

  static fromList(users: User[]) {
    return users.map((u) => new UserResponseDto(u));
  }
}