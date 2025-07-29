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

    // Validation basique
    if (!email || !password || !name || !phone) {
      return res.status(400).json({
        success: false,
        message: "Tous les champs sont obligatoires",
      });
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Un utilisateur avec cet email existe déjà",
      });
    }

    // Hacher le mot de passe
    const hashedPassword = await hashPassword(password);

    // Créer l'utilisateur
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone,
      },
    });

    // Générer et envoyer OTP
    const otp = generateOTP();
    const smsSent = await sendSMS(phone, `Votre code OTP est: ${otp}`);

    if (!smsSent) {
      // Si l'envoi SMS échoue, essayer par email
      await sendEmail(
        email,
        "Votre code de vérification",
        `Votre code OTP est: ${otp}`
      );
    }

    // Stocker OTP dans la base de données
    await prisma.user.update({
      where: { id: newUser.id },
      data: { otp },
    });

    return res.status(201).json({
      success: true,
      message: "Inscription réussie. Veuillez vérifier votre OTP.",
      data: {
        userId: newUser.id,
      },
    });
  } catch (error) {
    console.error("Erreur lors de l'inscription:", error);
    return res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de l'inscription",
    });
  }
};

export const verifyOTP = async (req: Request, res: Response): Promise<any> => {
  console.log("req.body:", req.body); // Ajoutez ceci pour déboguer
  try {
    const { otp, userId } = req.body;

    if (!otp || !userId) {
      return res.status(400).json({
        success: false,
        message: "OTP et userId sont requis",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Le compte est déjà vérifié",
      });
    }

    if (!validateOTP(otp, user.otp)) {
      return res.status(400).json({
        success: false,
        message: "OTP invalide",
      });
    }

    // Mettre à jour l'utilisateur comme vérifié
    await prisma.user.update({
      where: { id: userId },
      data: {
        otp: null,
        isVerified: true,
        status: "ACTIVE",
      },
    });

    return res.status(200).json({
      success: true,
      message: "OTP vérifié avec succès",
    });
  } catch (error) {
    console.error("Erreur lors de la vérification OTP:", error);
    return res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de la vérification OTP",
    });
  }
};

export const login = async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, password }: LoginData = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email et mot de passe sont requis",
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Email ou mot de passe incorrect",
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Compte non vérifié. Veuillez vérifier votre email.",
      });
    }

    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Email ou mot de passe incorrect",
      });
    }

    // Générer le token JWT
    const token = generateToken({
      id: user.id,
      email: user.email,
    });

    // Exclure le mot de passe des données retournées
    const { password: _, ...userData } = user;

    return res.status(200).json({
      success: true,
      message: "Connexion réussie",
      data: {
        token,
        user: userData,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la connexion:", error);
    return res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de la connexion",
    });
  }
};

export const logout = async (req: Request, res: Response): Promise<any> => {
  // Dans une implémentation basique, le logout se fait côté client en supprimant le token
  // Pour une implémentation plus avancée, vous pourriez utiliser une liste noire de tokens
  return res.status(200).json({
    success: true,
    message: "Déconnexion réussie",
  });
};

export const forgotPassword = async (req: Request, res: Response): Promise<any> => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email est requis",
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Aucun utilisateur avec cet email",
      });
    }

    // Générer un token de réinitialisation
    const resetToken = generateResToken({
      id: user.id,
      email: user.email,
    });

    // Enregistrer le token dans la base de données
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetExpires: new Date(Date.now() + 3600000), // 1 heure
      },
    });

    // Envoyer l'email de réinitialisation
    const resetUrl = `${env.frontendUrl}/reset-password?token=${resetToken}`;
    const emailSent = await sendEmail(
      email,
      "Réinitialisation de votre mot de passe",
      `Cliquez sur ce lien pour réinitialiser votre mot de passe: ${resetUrl}`,
      `<p>Cliquez <a href="${resetUrl}">ici</a> pour réinitialiser votre mot de passe.</p>`
    );

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: "Erreur lors de l'envoi de l'email",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Email de réinitialisation envoyé",
    });
  } catch (error) {
    console.error("Erreur lors de la demande de réinitialisation:", error);
    return res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de la demande de réinitialisation",
    });
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<any> => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Token et nouveau mot de passe sont requis",
      });
    }

    // Vérifier le token
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(400).json({
        success: false,
        message: "Token invalide ou expiré",
      });
    }

    // Vérifier que le token est toujours valide dans la base de données
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user || user.resetToken !== token || !user.resetExpires) {
      return res.status(400).json({
        success: false,
        message: "Token invalide ou expiré",
      });
    }

    if (user.resetExpires < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Token expiré",
      });
    }

    // Hacher le nouveau mot de passe
    const hashedPassword = await hashPassword(newPassword);

    // Mettre à jour le mot de passe et effacer le token
    await prisma.user.update({
      where: { id: decoded.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetExpires: null,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Mot de passe réinitialisé avec succès",
    });
  } catch (error) {
    console.error("Erreur lors de la réinitialisation du mot de passe:", error);
    return res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de la réinitialisation du mot de passe",
    });
  }
};