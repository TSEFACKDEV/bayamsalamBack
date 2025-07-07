import nodemailer from 'nodemailer'
import env from '../config/config'

const transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: parseInt(env.smtpPort || "587"),
    secure: false,
    auth:{
        user: env.smtpUser,
        pass: env.smtpPass
    }
})

interface MailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export const sendEmail = async (options:MailOptions) => {
    try {
        const mailOptions ={
            from: `"${env.fromName}" <${env.fromEmail}> `,
            to: options.to,
            subject: options.subject,
            text: options.text,
            html: options.html
        }
       await transporter.sendMail(mailOptions)
    } catch (error) {
        console.log('====================================');
        console.log("Failed to send email ", error);
        console.log('====================================');
    }
}


export const sendResetPasswordEmail = async (email: string, token: string) => {
  const resetUrl = `${env.frontendUrl}/reset-password?token=${token}`;
  const message = `
    <p>You requested a password reset. Click the link below to reset your password:</p>
    <p><a href="${resetUrl}">${resetUrl}</a></p>
    <p>If you didn't request this, please ignore this email.</p>
  `;

  await sendEmail({
    to: email,
    subject: 'Password Reset Request',
    html: message,
  });
};

export const sendVerificationEmail = async (email: string, token: string) => {
  const verifyUrl = `${env.frontendUrl}/verify-email?token=${token}`;
  const message = `
    <p>Thank you for registering. Please verify your email by clicking the link below:</p>
    <p><a href="${verifyUrl}">${verifyUrl}</a></p>
  `;

  await sendEmail({
    to: email,
    subject: 'Email Verification',
    html: message,
  });
};