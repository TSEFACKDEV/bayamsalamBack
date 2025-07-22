import jwt from "jsonwebtoken";
import env from "../config/config.js";

export const generateToken = (payload: object): string => {
    return jwt.sign(payload, env.jwtSecret , { expiresIn: "1d" });
};

export const verifyToken = (token: string): any => {
    return jwt.verify(token, env.jwtSecret);
};