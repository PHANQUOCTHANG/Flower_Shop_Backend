import { config } from "dotenv";
config() ;
export const secretKey = process.env.SECRET_KEY || "ab";
export const refreshSecretKey = process.env.REFRESH_SECRET_KEY || "ab" ;