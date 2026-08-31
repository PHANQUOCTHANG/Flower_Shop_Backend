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
import { CategoryService, ICategoryService } from "@/module/category/category.service";
import { ChatRepository, IChatRepository } from "@/module/chat/chat.repository";
import { ChatService, IChatService } from "@/module/chat/chat.service";
import {
  IOrderRepository,
  OrderRepository,
} from "@/module/order/order.repository";
import { IOrderService, OrderService } from "@/module/order/order.service";
import {
  CampaignRepository,
  ICampaignRepository,
} from "@/module/campaign/campaign.repository";
import { CampaignService, ICampaignService } from "@/module/campaign/campaign.service";
import { ImageService, IImageService } from "@/module/product/image.service";
import {
  IProductRepository,
  ProductRepository,
} from "@/module/product/product.repository";
import { ProductService, IProductService } from "@/module/product/product.service";
import { IUserRepository, UserRepository } from "@/module/user/user.repository";
import { UserService, IUserService } from "@/module/user/user.service";
import { IReviewService, ReviewService } from "@/module/review/review.service";
import {
  IReviewRepository,
  ReviewRepository,
} from "@/module/review/review.repository";
import { ReviewImageService, IReviewImageService } from "@/module/review/review.image.service";
import {
  IActivityLogRepository,
  ActivityLogRepository,
} from "@/module/activity-log/activity-log.repository";
import {
  IActivityLogService,
  ActivityLogService,
} from "@/module/activity-log/activity-log.service";
import {
  IWishlistRepository,
  WishlistRepository,
} from "@/module/wishlist/wishlist.repository";
import {
  IWishlistService,
  WishlistService,
} from "@/module/wishlist/wishlist.service";

// User
// User
const userRepository: IUserRepository = new UserRepository(prisma);
export const userService: IUserService = new UserService(userRepository);

// Product
const productRepository: IProductRepository = new ProductRepository(prisma);
export const productService: IProductService = new ProductService(productRepository);

// Category
const categoryRepository: ICategoryRepository = new CategoryRepository(prisma);
export const categoryService: ICategoryService = new CategoryService(categoryRepository);

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
  otpService,
);

// Campaign
const campaignRepository: ICampaignRepository = new CampaignRepository(prisma);
export const campaignService: ICampaignService = new CampaignService(campaignRepository);

// Cart
const cartRepository: ICartRepository = new CartRepository(prisma);
export const cartService: ICartService = new CartService(
  cartRepository,
  productRepository,
  campaignRepository,
);

// ActivityLog (khai báo trước Order vì OrderService phụ thuộc vào nó)
const activityLogRepository: IActivityLogRepository = new ActivityLogRepository(
  prisma,
);
export const activityLogService: IActivityLogService = new ActivityLogService(
  activityLogRepository,
);


// Order
const orderRepository: IOrderRepository = new OrderRepository(prisma);
export const orderService: IOrderService = new OrderService(
  orderRepository,
  cartRepository,
  userRepository,
  activityLogService,
  emailService,
  campaignRepository,
);
export const imageService: IImageService = new ImageService();

// Chat
const chatRepository: IChatRepository = new ChatRepository(prisma);
export const chatService: IChatService = new ChatService(
  chatRepository,
  prisma,
);

// Address
const addressRepository: IAddressRepository = new AddressRepository(prisma);
export const addressService: IAddressService = new AddressService(
  addressRepository,
);

// Review
const reviewRepository: IReviewRepository = new ReviewRepository(prisma);
export const reviewService: IReviewService = new ReviewService(
  reviewRepository,
  orderService,
);
export const reviewImageService: IReviewImageService = new ReviewImageService();

// Wishlist
const wishlistRepository: IWishlistRepository = new WishlistRepository(prisma);
export const wishlistService: IWishlistService = new WishlistService(
  wishlistRepository,
);

// VNPay
import { VnpayService, IVnpayService } from "@/module/vnpay/vnpay.service";
export const vnpayService: IVnpayService = new VnpayService();
