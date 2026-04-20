import {config} from "dotenv";
import {resolve} from "node:path";

export const NODE_ENV = process.env.NODE_ENV;

config({path: resolve(__dirname, `../../${NODE_ENV}.env`)});

export const PORT: number = Number(process.env.PORT) || 7000;
export const MONGO_URI = process.env.MONGO_URI!;
export const REDIS_URI = process.env.REDIS_URI!;
export const SALT_ROUND = Number(process.env.SALT_ROUND);
export const ENCRYPT_SECRET_KEY = process.env.ENCRYPT_SECRET_KEY;
export const ACCESS_SECRET_KEY_USER = process.env.ACCESS_SECRET_KEY_USER;
export const ACCESS_SECRET_KEY_ADMIN = process.env.ACCESS_SECRET_KEY_ADMIN;
export const REFRESH_SECRET_KEY_USER = process.env.REFRESH_SECRET_KEY_USER;
export const REFRESH_SECRET_KEY_ADMIN = process.env.REFRESH_SECRET_KEY_ADMIN;
export const WEB_CLIENT_ID = process.env.WEB_CLIENT_ID;
export const EMAIL = process.env.EMAIL;
export const PASSWORD = process.env.PASSWORD;
export const PREFIX_USER = process.env.PREFIX_USER;
export const PREFIX_ADMIN = process.env.PREFIX_ADMIN;
