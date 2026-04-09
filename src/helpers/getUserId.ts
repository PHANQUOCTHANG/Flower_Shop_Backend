import { Request } from "express";

export const getUserId = (req: Request): string => {
  if (!req.user) {
    throw new Error("Unauthorized");
  }

  return req.user.userId as string;
};
