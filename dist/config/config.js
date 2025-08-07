"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const env = {
    port: process.env.PORT || "3001",
    host: process.env.HOST || "127.0.0.1",
    nodeEnv: process.env.NODE_ENV || "development",
    jwtSecret: process.env.JWT_SECRET || "KleinDev",
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
    jwtResetExpiresIn: process.env.JWT_RESET_EXPIRES_IN || "1h",
    smtpHost: process.env.SMTP_HOST || "",
    smtpPort: process.env.SMTP_PORT || "587",
    smtpUser: process.env.SMTP_USER || "",
    smtpPass: process.env.SMTP_PASS || "",
    fromEmail: process.env.FROM_EMAIL || "",
    fromName: process.env.FROM_NAME || "",
    nexahUser: process.env.NEXAH_USER || "",
    nexahPassword: process.env.NEXAH_PASSWORD || "",
    nexahSenderId: process.env.NEXAH_SENDER_ID || "",
    frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
};
exports.default = env;
