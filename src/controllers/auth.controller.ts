import { Request, Response } from "express";
import {
  hashPassword,
  comparePassword,
} from "../utilities/bcrypt.js";
import { generateToken, generateResToken, verifyToken } from "../utilities/token.js";
import { sendEmail } from "../utilities/mailer.js";
import { sendSMS } from "../utilities/sms.js";
import { generateOTP, validateOTP } from "../utilities/otp.js";
import prisma from "../model/prisma.client.js";
import env from "../config/config.js";
import ResponseApi from "../helper/response.js";


interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone: string;
}

interface LoginData {
  email: string;
  password: string;
}

export const register = async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, password, name, phone }: RegisterData = req.body;

    if (!email || !password || !name || !phone) {
      return ResponseApi.error(res, "Tous les champs sont obligatoires", null, 400);
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return ResponseApi.error(res, "Un utilisateur avec cet email existe déjà", null, 400);
    }

    const hashedPassword = await hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone,
      },
    });

    const otp = generateOTP();
    const smsSent = await sendSMS(phone, `Votre code OTP est: ${otp}`);

    if (!smsSent) {
      await sendEmail(
        email,
        "Votre code de vérification",
        `Votre code OTP est: ${otp}`
      );
    }

    await prisma.user.update({
      where: { id: newUser.id },
      data: { otp },
    });

    return ResponseApi.success(res, "Inscription réussie. Veuillez vérifier votre OTP.", {
      userId: newUser.id,
    }, 201);
  } catch (error: any) {
    console.error("Erreur lors de l'inscription:", error);
    return ResponseApi.error(res, "Une erreur est survenue lors de l'inscription", error.message, 500);
  }
};

export const verifyOTP = async (req: Request, res: Response): Promise<any> => {
  try {
    const { otp, userId } = req.body;

    if (!otp || !userId) {
      return ResponseApi.error(res, "OTP et userId sont requis", null, 400);
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return ResponseApi.notFound(res, "Utilisateur non trouvé", 404);
    }

    if (existingUser.isVerified) {
      return ResponseApi.error(res, "Le compte est déjà vérifié", null, 400);
    }

    if (!validateOTP(otp, existingUser.otp)) {
      return ResponseApi.error(res, "OTP invalide", null, 400);
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        otp: null,
        isVerified: true,
        status: "ACTIVE",
      },
    });

    return ResponseApi.success(res, "OTP vérifié avec succès", user, 200);
  } catch (error: any) {
    console.error("Erreur lors de la vérification OTP:", error);
    return ResponseApi.error(res, "Une erreur est survenue lors de la vérification OTP", error.message, 500);
  }
};

export const login = async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, password }: LoginData = req.body;

    if (!email || !password) {
      return ResponseApi.error(res, "Email et mot de passe sont requis", null, 400);
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return ResponseApi.error(res, "Email ou mot de passe incorrect", null, 401);
    }

    if (!user.isVerified) {
      return ResponseApi.error(res, "Compte non vérifié. Veuillez vérifier votre email.", null, 403);
    }

    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      return ResponseApi.error(res, "Email ou mot de passe incorrect", null, 401);
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
    });

    const { password: _, ...userData } = user;

    return ResponseApi.success(res, "Connexion réussie", {
      token,
      user: userData,
    });
  } catch (error: any) {
    console.error("Erreur lors de la connexion:", error);
    return ResponseApi.error(res, "Une erreur est survenue lors de la connexion", error.message, 500);
  }
};

export const logout = async (req: Request, res: Response): Promise<any> => {
  return ResponseApi.success(res, "Déconnexion réussie",null);
};

export const forgotPassword = async (req: Request, res: Response): Promise<any> => {
  try {
    const { email } = req.body;

    if (!email) {
      return ResponseApi.error(res, "Email est requis", null, 400);
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return ResponseApi.notFound(res, "Aucun utilisateur avec cet email", 404);
    }

    const resetToken = generateResToken({
      id: user.id,
      email: user.email,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetExpires: new Date(Date.now() + 3600000),
      },
    });

    const resetUrl = `${env.frontendUrl}/reset-password?token=${resetToken}`;
    const emailSent = await sendEmail(
      email,
      "Réinitialisation de votre mot de passe",
      `Cliquez sur ce lien pour réinitialiser votre mot de passe: ${resetUrl}`,
      `<p>Cliquez <a href="${resetUrl}">ici</a> pour réinitialiser votre mot de passe.</p>`
    );

    if (!emailSent) {
      return ResponseApi.error(res, "Erreur lors de l'envoi de l'email", null, 500);
    }

    return ResponseApi.success(res, "Email de réinitialisation envoyé", null, 200);
  } catch (error: any) {
    console.error("Erreur lors de la demande de réinitialisation:", error);
    return ResponseApi.error(res, "Une erreur est survenue lors de la demande de réinitialisation", error.message, 500);
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<any> => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return ResponseApi.error(res, "Token et nouveau mot de passe sont requis", null, 400);
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return ResponseApi.error(res, "Token invalide ou expiré", null, 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user || user.resetToken !== token || !user.resetExpires) {
      return ResponseApi.error(res, "Token invalide ou expiré", null, 400);
    }

    if (user.resetExpires < new Date()) {
      return ResponseApi.error(res, "Token expiré", null, 400);
    }

    const hashedPassword = await hashPassword(newPassword);

   const newUser = await prisma.user.update({
      where: { id: decoded.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetExpires: null,
      },
    });

    return ResponseApi.success(res, "Mot de passe réinitialisé avec succès", newUser, 200);
  } catch (error: any) {
    console.error("Erreur lors de la réinitialisation du mot de passe:", error);
    return ResponseApi.error(res, "Une erreur est survenue lors de la réinitialisation du mot de passe", error.message, 500);
  }
};