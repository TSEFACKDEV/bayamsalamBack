var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import nodemailer from "nodemailer";
import env from "../config/config.js";
const transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: parseInt(env.smtpPort),
    secure: false, // true for 465, false for other ports
    auth: {
        user: env.smtpUser,
        pass: env.smtpPass,
    },
});
export const sendEmail = (to, subject, text, html) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield transporter.sendMail({
            from: `"${env.fromName}" <${env.fromEmail}>`,
            to,
            subject,
            text,
            html: html || text,
        });
        return true;
    }
    catch (error) {
        console.error("Error sending email:", error);
        return false;
    }
});
