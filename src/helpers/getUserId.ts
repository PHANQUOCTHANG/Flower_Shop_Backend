import { Request } from "express";

export const getUserId = (req: Request): string=> {
  if (!req.user) {
    throw new Error("Unauthorized");
  }

  return req.user.sub as string;
};