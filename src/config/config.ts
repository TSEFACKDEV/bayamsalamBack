import dotenv from "dotenv";

dotenv.config();

interface Env {
  port: string;
  host: string;
  nodeEnv: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  jwtResetExpiresIn: string;
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
  fromEmail: string;
  fromName: string;
  nexahUser: string;
  nexahPassword: string;
  nexahSenderId: string;
  frontendUrl: string;
  refreshTokenSecretKey: string;
  MONETBIL_SERVICE_KEY: string;
  MONETBIL_BASE_URL: string;
}

const env: Env = {
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
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  refreshTokenSecretKey: process.env.REFRESH_TOKEN_SECRET_KEY || "",
  MONETBIL_SERVICE_KEY: process.env.MONETBIL_SERVICE_KEY || "",
  MONETBIL_BASE_URL: process.env.MONETBIL_BASE_URL || "",
};

export default env;
