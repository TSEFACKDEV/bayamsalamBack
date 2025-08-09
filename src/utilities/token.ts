import jwt from "jsonwebtoken";
import env from "../config/config.js";

export const generateToken = (payload: object): string => {
    return jwt.sign(payload, env.jwtSecret , { expiresIn: "1d" });
};

export const generateRefreshToken = (payload: object): string => {
    return jwt.sign(payload, env.refreshTokenSecretKey , { expiresIn: "30d" });
};

export const generateResToken = (payload: object): string => {
    return jwt.sign(payload, env.jwtSecret , { expiresIn: "15min" });
};

export const verifyToken = (token: string): any => {
    return jwt.verify(token, env.jwtSecret);
};