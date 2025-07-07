import dotenv from "dotenv";

dotenv.config();

interface Env {
  port: string;
  host: string;
  nodeEnv: string;
  jwtSecret: string;
  frontendUrl: string;
  jwtExpiresIn: string;
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
  fromName: string;
  fromEmail: string;
  uploadPath: string;
  maxImageSize: string;
  maxPdfSize: string;
}

const env: Env = {
  //variables pour le server
  port: process.env.PORT || "3000",
  host: process.env.host || "127.0.0.1",
  nodeEnv: process.env.NODE_ENV || "development",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",

  //variable jsonwebtoken
  jwtSecret: process.env.JWT_SECRET || "klein",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",

  //variables nodemailer
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: process.env.SMTP_PORT || "",
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  fromName: process.env.FROM_NAME || "",
  fromEmail: process.env.FROM_EMAIL || "",

  //multer upload file
  uploadPath: process.env.UPLOAD_PATH || "",
  maxImageSize: process.env.MAX_IMAGE_SIZE || "",
  maxPdfSize: process.env.MAX_PDF_SIZE || "",
};

export default env;
