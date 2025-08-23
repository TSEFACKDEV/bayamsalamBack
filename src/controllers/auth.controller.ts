import { NextFunction, Request, Response } from "express";
import { hashPassword, comparePassword } from "../utilities/bcrypt.js";
import {
  generateToken,
  generateResToken,
  verifyToken,
  generateRefreshToken,
} from "../utilities/token.js";
import { sendEmail } from "../utilities/mailer.js";
import { sendSMS } from "../utilities/sms.js";
import { generateOTP, validateOTP } from "../utilities/otp.js";
import prisma from "../model/prisma.client.js";
import env from "../config/config.js";
import ResponseApi from "../helper/response.js";
import { createOTPEmailTemplate } from "../templates/otpEmailTemplate.js";
import { createNotification } from "../services/notification.service.js";

interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone: string;
  firstName: string;
  lastName: string;
}

interface LoginData {
  email: string;
  password: string;
}

export const register = async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, password, firstName, lastName, phone }: RegisterData =
      req.body;

    if (!email || !password || !firstName || !lastName || !phone) {
      return ResponseApi.error(
        res,
        "Tous les champs sont obligatoires",
        null,
        400
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return ResponseApi.error(
        res,
        "Un utilisateur avec cet email existe déjà",
        null,
        400
      );
    }

    const hashedPassword = await hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
      },
    });

    // Ajout automatique du rôle USER
    const userRole = await prisma.role.findUnique({ where: { name: "USER" } });
    if (userRole) {
      await prisma.userRole.create({
        data: {
          userId: newUser.id,
          roleId: userRole.id,
        },
      });
    }

    const otp = generateOTP();
    const smsSent = await sendSMS(phone, `Votre code OTP est: ${otp}`);
    /* log de l'otp pour le developement sans connexion */
    console.log("====================================");
    console.log(otp);
    console.log("====================================");

    if (!smsSent) {
      // Plus besoin de logoUrl !
      const htmlTemplate = createOTPEmailTemplate(firstName, lastName, otp);

      await sendEmail(
        email,
        "🔐 Code de vérification BuyamSale - Bienvenue !",
        `Bonjour ${firstName} ${lastName},\n\nVotre code OTP est: ${otp}\n\nBienvenue sur BuyamSale !`,
        htmlTemplate
      );
    }
    await prisma.user.update({
      where: { id: newUser.id },
      data: { otp },
    });

    return ResponseApi.success(
      res,
      "Inscription réussie. Veuillez vérifier votre OTP.",
      {
        userId: newUser.id,
      },
      201
    );
  } catch (error: any) {
    console.error("Erreur lors de l'inscription:", error);
    return ResponseApi.error(
      res,
      "Une erreur est survenue lors de l'inscription",
      error.message,
      500
    );
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

    // Créer notification de bienvenue
    await createNotification(user.id, "Bienvenue sur BuyamSale", "Votre compte a été vérifié avec succès. Bienvenue !", {
      type: "WELCOME",
      link: "/",
    });

    // Envoi du mail de bienvenue après vérification OTP
    try {
      // Import dynamique pour éviter les problèmes d'import circulaire
      const { createWelcomeTemplate } = await import("../templates/welComeTemplate.js");
      const htmlTemplate = createWelcomeTemplate(user.firstName, user.lastName);

      await sendEmail(
        user.email,
        "🎉 Bienvenue sur BuyamSale !",
        `Bonjour ${user.firstName} ${user.lastName},\n\nVotre compte a été vérifié avec succès. Bienvenue sur BuyamSale !`,
        htmlTemplate
      );
    } catch (mailError) {
      console.error("Erreur lors de l'envoi du mail de bienvenue:", mailError);
      // On ne bloque pas la réponse si le mail échoue
    }

    return ResponseApi.success(res, "OTP vérifié avec succès", user, 200);
  } catch (error: any) {
    console.error("Erreur lors de la vérification OTP:", error);
    return ResponseApi.error(
      res,
      "Une erreur est survenue lors de la vérification OTP",
      error.message,
      500
    );
  }
};

export const login = async (req: Request, res: Response): Promise<any> => {
  try {
    const { identifiant, password }: { identifiant: string; password: string } =
      req.body;

    if (!identifiant || !password) {
      return ResponseApi.error(
        res,
        "Identifiant et mot de passe sont requis",
        null,
        400
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: identifiant }, { phone: identifiant }],
      },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return ResponseApi.error(
        res,
        "Identifiant ou mot de passe incorrect",
        null,
        401
      );
    }

    if (!user.isVerified) {
      return ResponseApi.error(
        res,
        "Compte non vérifié. Veuillez vérifier votre email.",
        null,
        403
      );
    }

    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      return ResponseApi.error(
        res,
        " Identifiant ou mot de passe incorrect",
        null,
        401
      );
    }

    const AccessToken = generateToken({
      id: user.id,
      email: user.email,
    });

    const refreshToken = generateRefreshToken({
      id: user.id,
      email: user.email,
    });

    const { password: _, ...userData } = user;

    const permissions = userData.roles.flatMap((userRole) => {
      return userRole.role.permissions.map((permission) => {
        return {
          permissionKey: permission.permission.permissionKey,
          title: permission.permission.title,
        };
      });
    });

    const permissionKeys = user.roles.flatMap((userRole) => {
      return userRole.role.permissions.map((permission) => {
        return permission.permission.permissionKey;
      });
    });

    const roles = user.roles.map((userRole) => {
      return userRole.role.name;
    });

    // Récuperation des permissions sans doublons
    const uniquePermissions = Array.from(
      new Map(
        permissions.map((permission) => {
          return [permission.permissionKey, permission];
        })
      ).values()
    );

    // userData.roles = roles;
    // userData.permissions = uniquePermissions;
    // userData.permissionKeys = permissionKeys;

    return ResponseApi.success(res, "Connexion réussie", {
      token: {
        type: "Bearer",
        AccessToken,
        refreshToken,
      },
      user: userData,
    });
  } catch (error: any) {
    console.error("Erreur lors de la connexion:", error);
    return ResponseApi.error(
      res,
      "Une erreur est survenue lors de la connexion",
      error.message,
      500
    );
  }
};

/**
 * Refresh TOKEN
 */

export const refreshToken = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { jwt } = req.cookies;
    const refreshToken = jwt;

    if (!refreshToken) {
      return ResponseApi.error(res, "No Refresh Token found", 400);
    }

    const decoded = verifyToken(refreshToken);
    if (!decoded) {
      return ResponseApi.error(res, "Invalid Refresh Token", 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      return ResponseApi.error(res, "User not found", 404);
    }

    const newAccessToken = generateToken({
      id: user.id,
      email: user.email,
    });

    return ResponseApi.success(res, "Token refreshed successfully", {
      token: {
        type: "Bearer",
        AccessToken: newAccessToken,
      },
    });
  } catch (error: any) {
    console.error("Error refreshing token:", error);
    return ResponseApi.error(
      res,
      "An error occurred while refreshing token",
      error.message,
      500
    );
  }
};

/**
 * Déconnexion de l'utilisateur.
 */
export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { jwt } = req.cookies;
    const refreshToken = jwt;

    // Si pas de refresh token, on considère que l'utilisateur est déjà déconnecté
    if (!refreshToken) {
      // Supprimer le cookie quand même par sécurité
      res.clearCookie("jwt", {
        httpOnly: true,
        secure: env.nodeEnv === "production",
        sameSite: "strict",
      });

      return ResponseApi.success(res, "Already logged out", {}, 200);
    }

    // Révoquer le Refresh Token dans la base de données
    const user = await prisma.user.findFirst({ where: { refreshToken } });
    console.log("Utilisateur trouvé pour ce refreshToken:", user);

    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: null },
      });
    }

    // Supprimer le cookie dans tous les cas
    res.clearCookie("jwt", {
      httpOnly: true,
      secure: env.nodeEnv === "production",
      sameSite: "strict",
    });

    return ResponseApi.success(res, "Logout successful !!!", {}, 200);
  } catch (error) {
    console.error("Erreur lors de la déconnexion:", error);

    // Même en cas d'erreur, supprimer le cookie pour forcer la déconnexion côté client
    res.clearCookie("jwt", {
      httpOnly: true,
      secure: env.nodeEnv === "production",
      sameSite: "strict",
    });

    return ResponseApi.success(res, "Logout completed with cleanup", {}, 200);
  }
};

export const forgotPassword = async (
  req: Request,
  res: Response
): Promise<any> => {
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

    // 🔍 LOG: Token généré pour forgot password
    console.log("🔍 Forgot Password - Token généré:", {
      userId: user.id,
      tokenLength: resetToken.length,
      tokenStart: resetToken.substring(0, 50) + "...",
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetExpires: new Date(Date.now() + 60 * 60 * 1000), // 1 heure pour correspondre au JWT
      },
    });

    // 🔍 LOG: Vérification après sauvegarde
    const savedUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { resetToken: true, resetExpires: true },
    });
    console.log("🔍 Forgot Password - Token sauvegardé:", {
      savedTokenLength: savedUser?.resetToken?.length,
      savedTokenStart: savedUser?.resetToken?.substring(0, 50) + "...",
      expiresAt: savedUser?.resetExpires,
    });

    // 🔧 CORRECTION : Génération du lien de réinitialisation
    // PROBLÈME : Avant, le lien pointait vers l'accueil avec ?token=xxx
    // SOLUTION : Maintenant, le lien pointe vers la page spécifique de reset password
    const resetUrl = `${env.frontendUrl}/auth/reset-password?token=${resetToken}`;

    const emailSent = await sendEmail(
      email,
      "Réinitialisation de votre mot de passe",
      `Cliquez sur ce lien pour réinitialiser votre mot de passe: ${resetUrl}`,
      `<p>Cliquez <a href="${resetUrl}">ici</a> pour réinitialiser votre mot de passe.</p>`
    );

    if (!emailSent) {
      return ResponseApi.error(
        res,
        "Erreur lors de l'envoi de l'email",
        null,
        500
      );
    }

    return ResponseApi.success(
      res,
      "Email de réinitialisation envoyé",
      null,
      200
    );
  } catch (error: any) {
    console.error("Erreur lors de la demande de réinitialisation:", error);
    return ResponseApi.error(
      res,
      "Une erreur est survenue lors de la demande de réinitialisation",
      error.message,
      500
    );
  }
};

export const resetPassword = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { token: rawToken, newPassword } = req.body;

    // Décodage URL du token au cas où il serait encodé
    const token = decodeURIComponent(rawToken);
    if (!token || !newPassword) {
      return ResponseApi.error(
        res,
        "Token et nouveau mot de passe sont requis",
        null,
        400
      );
    }

    let decoded;
    try {
      decoded = verifyToken(token);
      console.log("🔍 Reset Password - Token decoded successfully:", {
        userId: decoded?.id,
      });
    } catch (jwtError: any) {
      console.log("🔍 Reset Password - JWT Error:", {
        error: jwtError.message,
        name: jwtError.name,
      });
      return ResponseApi.error(res, "Token invalide ou expiré", null, 400);
    }

    if (!decoded) {
      return ResponseApi.error(res, "Token invalide ou expiré", null, 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    // 🔍 LOG 3: Vérification de l'utilisateur et du token stocké
    console.log("🔍 Reset Password - User check:", {
      userExists: !!user,
      hasResetToken: !!user?.resetToken,
      tokenMatch: user?.resetToken === token,
      hasResetExpires: !!user?.resetExpires,
      expiresAt: user?.resetExpires,
      now: new Date(),
    });

    // 🔍 LOG 4: Comparaison détaillée des tokens
    console.log("🔍 Reset Password - Token comparison:", {
      tokenFromRequest: token.substring(0, 50) + "...",
      tokenFromDB: user?.resetToken?.substring(0, 50) + "...",
      tokenLengths: {
        request: token.length,
        db: user?.resetToken?.length,
      },
      areEqual: user?.resetToken === token,
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

    console.log("✅ Reset Password - Succès pour userId:", decoded.id);

    return ResponseApi.success(
      res,
      "Mot de passe réinitialisé avec succès",
      newUser,
      200
    );
  } catch (error: any) {
    console.error(
      "❌ Erreur lors de la réinitialisation du mot de passe:",
      error
    );
    return ResponseApi.error(
      res,
      "Une erreur est survenue lors de la réinitialisation du mot de passe",
      error.message,
      500
    );
  }
};

export const getUserProfile = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return ResponseApi.error(res, "Utilisateur non authentifié", null, 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isVerified: true,
        status: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
        lastConnexion: true,
        roles: {
          select: {
            id: true,
            roleId: true,
            userId: true,
            assignedAt: true,
            assignedBy: true,
            role: {
              select: {
                id: true,
                name: true,
                description: true,
                createdAt: true,
                updatedAt: true,
                permissions: {
                  select: {
                    id: true,
                    roleId: true,
                    permissionId: true,
                    assignedAt: true,
                    permission: {
                      select: {
                        id: true,
                        permissionKey: true,
                        title: true,
                        description: true,
                        createdAt: true,
                        updatedAt: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        products: {
          select: {
            id: true,
            name: true,
            price: true,
            quantity: true,
            description: true,
            images: true,
            status: true,
            etat: true,
            quartier: true,
            telephone: true,
            createdAt: true,
            updatedAt: true,
            category: {
              select: {
                id: true,
                name: true,
              },
            },
            city: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return ResponseApi.notFound(res, "Utilisateur non trouvé", 404);
    }

    return ResponseApi.success(
      res,
      "Profil utilisateur récupéré avec succès",
      user,
      200
    );
  } catch (error: any) {
    console.error(
      "Erreur lors de la récupération du profil utilisateur:",
      error
    );
    return ResponseApi.error(
      res,
      "Une erreur est survenue lors de la récupération du profil utilisateur",
      error.message,
      500
    );
  }
};
