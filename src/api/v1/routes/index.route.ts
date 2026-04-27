import { Application } from "express";
import userRoute from "@/module/user/user.route";
import productRoute from "@/module/product/product.route";
import categoryRoute from "@/module/category/category.route";
import authRoute from "@/module/auth/auth.routes";
import orderRoute from "@/module/order/order.route";
import cartRoute from "@/module/cart/cart.route";
import chatRoute from "@/module/chat/chat.route";
import addressRouter from "@/module/address/address.route";
import { requireAuth } from "@/middleware/auth.middleware";
import reviewRoute from "@/module/review/review.route";
import activityLogRoute from "@/module/activity-log/activity-log.route";


const clientRoute = (app: Application) => {
  const path = "/api";
  app.use(path + "/users", requireAuth, userRoute);
  app.use(path + "/products", productRoute);
  app.use(path + "/categories", categoryRoute);
  app.use(path + "/auth", authRoute);
  app.use(path + "/cart", requireAuth, cartRoute);
  app.use(path + "/orders", requireAuth, orderRoute);
  app.use(path + "/addresses", addressRouter);
  app.use(path + "/chats", requireAuth, chatRoute);
  app.use(path + "/reviews", reviewRoute);
  app.use(path + "/activity-logs", requireAuth, activityLogRoute);
};

export default clientRoute;
