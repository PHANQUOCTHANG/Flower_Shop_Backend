import { JwtPayload as DefaultJwtPayload } from "jsonwebtoken";

export interface JwtPayload extends DefaultJwtPayload {
  userId: string;
  email?: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export {};
