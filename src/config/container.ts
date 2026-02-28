import prisma from "@/lib/prisma";
import {
  CategoryRepository,
  ICategoryRepository,
} from "@/module/category/category.repository";
import { CategoryService } from "@/module/category/category.service";
import {
  IProductRepository,
  ProductRepository,
} from "@/module/product/product.repository";
import { ProductService } from "@/module/product/product.service";
import { IUserRepository, UserRepository } from "@/module/user/user.repository";
import { UserService } from "@/module/user/user.service";

// User
const userRepository: IUserRepository = new UserRepository(prisma);
export const userService = new UserService(userRepository);

// Product
const productRepository: IProductRepository = new ProductRepository(prisma);
export const productService = new ProductService(productRepository);

// Category
const categoryRepository: ICategoryRepository = new CategoryRepository(prisma);
export const categoryService = new CategoryService(categoryRepository);
