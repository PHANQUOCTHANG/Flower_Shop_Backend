import prisma from "@/lib/prisma";
import { AuthService, IAuthService } from "@/module/auth/auth.service";
import { EmailService, IEmailService } from "@/module/auth/email/email.service";
import {
  IOtpRepository,
  OtpRepository,
} from "@/module/auth/otp/otp.repository";
import { IOtpService, OtpService } from "@/module/auth/otp/otp.service";
import {
  IRefreshTokenRepository,
  RefreshTokenRepository,
} from "@/module/auth/refreshToken/refreshToken.repository";
import {
  AddressRepository,
  IAddressRepository,
} from "@/module/address/address.repository";
import {
  AddressService,
  IAddressService,
} from "@/module/address/address.service";
import { CartRepository, ICartRepository } from "@/module/cart/cart.repository";
import { CartService, ICartService } from "@/module/cart/cart.service";
import {
  CategoryRepository,
  ICategoryRepository,
} from "@/module/category/category.repository";
import { CategoryService } from "@/module/category/category.service";
import { ChatRepository, IChatRepository } from "@/module/chat/chat.repository";
import { ChatService, IChatService } from "@/module/chat/chat.service";
import {
  IOrderRepository,
  OrderRepository,
} from "@/module/order/order.repository";
import { IOrderService, OrderService } from "@/module/order/order.service";
import { ImageService } from "@/module/product/image.service";
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

// Email
export const emailService: IEmailService = new EmailService();

// Otp
const otpRepository: IOtpRepository = new OtpRepository(prisma);
export const otpService: IOtpService = new OtpService(
  otpRepository,
  userRepository,
);

// Refresh Token
const refreshTokenRepository: IRefreshTokenRepository =
  new RefreshTokenRepository(prisma);

// Auth
export const authService: IAuthService = new AuthService(
  userRepository,
  refreshTokenRepository,
  otpRepository,
);

// Cart
const cartRepository: ICartRepository = new CartRepository(prisma);
export const cartService: ICartService = new CartService(
  cartRepository,
  productRepository,
);

// Order
const orderRepository: IOrderRepository = new OrderRepository(prisma);
export const orderService: IOrderService = new OrderService(
  orderRepository,
  cartRepository,
  userRepository,
);
export const imageService = new ImageService();

// Chat
const chatRepository: IChatRepository = new ChatRepository(prisma);
export const chatService: IChatService = new ChatService(chatRepository);

// Address
const addressRepository: IAddressRepository = new AddressRepository(prisma);
export const addressService: IAddressService = new AddressService(
  addressRepository,
);
