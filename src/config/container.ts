
import prisma from "@/lib/prisma";
import { IUserRepository, UserRepository } from "@/module/user/user.repository";
import { UserService } from "@/module/user/user.service";

// Repository
const userRepository: IUserRepository =
  new UserRepository(prisma);

// Service
export const userService = new UserService(userRepository);
