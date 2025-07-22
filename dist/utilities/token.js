import jwt from "jsonwebtoken";
import env from "../config/config.js";
export const generateToken = (payload) => {
    return jwt.sign(payload, env.jwtSecret, { expiresIn: "1d" });
};
export const verifyToken = (token) => {
    return jwt.verify(token, env.jwtSecret);
};
