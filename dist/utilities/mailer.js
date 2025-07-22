var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import nodemailer from 'nodemailer';
import env from '../config/config';
const transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: parseInt(env.smtpPort || "587"),
    secure: false,
    auth: {
        user: env.smtpUser,
        pass: env.smtpPass
    }
});
export const sendEmail = (options) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const mailOptions = {
            from: `"${env.fromName}" <${env.fromEmail}> `,
            to: options.to,
            subject: options.subject,
            text: options.text,
            html: options.html
        };
        yield transporter.sendMail(mailOptions);
    }
    catch (error) {
        console.log('====================================');
        console.log("Failed to send email ", error);
        console.log('====================================');
    }
});
export const sendResetPasswordEmail = (email, token) => __awaiter(void 0, void 0, void 0, function* () {
    const resetUrl = `${env.frontendUrl}/reset-password?token=${token}`;
    const message = `
    <p>You requested a password reset. Click the link below to reset your password:</p>
    <p><a href="${resetUrl}">${resetUrl}</a></p>
    <p>If you didn't request this, please ignore this email.</p>
  `;
    yield sendEmail({
        to: email,
        subject: 'Password Reset Request',
        html: message,
    });
});
export const sendVerificationEmail = (email, token) => __awaiter(void 0, void 0, void 0, function* () {
    const verifyUrl = `${env.frontendUrl}/verify-email?token=${token}`;
    const message = `
    <p>Thank you for registering. Please verify your email by clicking the link below:</p>
    <p><a href="${verifyUrl}">${verifyUrl}</a></p>
  `;
    yield sendEmail({
        to: email,
        subject: 'Email Verification',
        html: message,
    });
});
