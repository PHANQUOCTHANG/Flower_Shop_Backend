import { Application } from "express";
import userRoute from "@/module/user/user.route";
import productRoute from "@/module/product/product.route";
import categoryRoute from "@/module/category/category.route";
import authRoute from "@/module/auth/auth.routes";

const clientRoute = (app: Application) => {
  const path = "/api";
  app.use(path + "/users", userRoute);
  app.use(path + "/products" , productRoute) ;
  app.use(path + "/categories", categoryRoute) ;
  app.use(path + "/auth", authRoute)
};

export default clientRoute;
