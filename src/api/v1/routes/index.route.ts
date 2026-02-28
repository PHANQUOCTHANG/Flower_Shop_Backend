import { Application } from "express";
import userRoute from "@/module/user/user.route";

const clientRoute = (app: Application) => {
  const path = "/api";
  app.use(path + "/users", userRoute);
};

export default clientRoute;
