import { Application } from "express";
import userRoute from "@/module/user/user.route";
import productRoute from "@/module/product/product.route";
import categoryRoute from "@/module/category/category.route";

const clientRoute = (app: Application) => {
  const path = "/api";
  app.use(path + "/users", userRoute);
  app.use(path + "/products" , productRoute)
  app.use(path + "/categories", categoryRoute)
};

export default clientRoute;
