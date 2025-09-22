/**
 * 🔐 CONTRÔLEUR D'AUTHENTIFICATION - BuyAndSale
 *
 * Ce module gère l'authentification et l'autorisation des utilisateurs.
 *
 * FONCTIONNALITÉS PRINCIPALES:
 * - Inscription et vérification OTP
 * - Connexion locale et Google OAuth
 * - Gestion des tokens JWT (Access + Refresh)
 * - Support multi-device (sessions simultanées)
 * - Réinitialisation de mot de passe
 * - Gestion sécurisée des erreurs
 *
 * 🔒 STRATÉGIE DE SÉCURITÉ:
 * - Validation stricte des entrées utilisateur
 * - Hachage sécurisé des mots de passe
 * - Rotation automatique des refresh tokens
 * - Gestion permissive pour sessions multiples
 * - Logs détaillés pour monitoring
 *
 * 📱 SUPPORT MULTI-DEVICE:
 * Les utilisateurs peuvent se connecter depuis plusieurs appareils simultanément.
 * Les anciens refresh tokens restent valides pour éviter les déconnexions forcées.
 */

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
import Utils from "../helper/utils.js";
import { createOTPEmailTemplate } from "../templates/otpEmailTemplate.js";
import { createNotification } from "../services/notification.service.js";
import {
  validateAndNormalizeRegistration,
  validateLoginData,
} from "../utilities/input.validation.js";

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
    // 🔐 VALIDATION SÉCURISÉE DES DONNÉES
    const validation = validateAndNormalizeRegistration(req.body);
    if (!validation.isValid) {
      return ResponseApi.error(
        res,
        validation.message || "Données invalides",
        null,
        400
      );
    }

    const { email, firstName, lastName, phone, password } =
      validation.normalizedData!;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // Permettre la réinscription si compte non vérifié
      if (!existingUser.isVerified) {
        // Supprimer l'ancien compte non vérifié et ses relations
        await prisma.userRole.deleteMany({
          where: { userId: existingUser.id },
        });
        await prisma.user.delete({
          where: { id: existingUser.id },
        });

        console.log(`Compte non vérifié supprimé pour réinscription: ${email}`);
      } else {
        // Compte déjà vérifié, impossible de se réinscrire
        return ResponseApi.error(
          res,
          "Un utilisateur avec cet email existe déjà",
          null,
          400
        );
      }
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
    // Log OTP en développement pour faciliter les tests
    if (process.env.NODE_ENV === "development") {
      console.log(`OTP pour ${phone}: ${otp}`);
    }

    if (!smsSent) {
      // Plus besoin de logoUrl !
      const htmlTemplate = createOTPEmailTemplate(firstName, lastName, otp);

      await sendEmail(
        email,
        "🔐 Code de vérification BuyAndSale - Bienvenue !",
        `Bonjour ${firstName} ${lastName},\n\nVotre code OTP est: ${otp}\n\nBienvenue sur BuyAndSale !`,
        htmlTemplate
      );
    }
    await prisma.user.update({
      where: { id: newUser.id },
      data: {
        otp,
        otpExpires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes d'expiration
        otpAttempts: 1, // Premier envoi d'OTP
        otpLastAttempt: new Date(), // Timestamp du premier envoi
      },
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

    // 🕒 VÉRIFICATION DE L'EXPIRATION DE L'OTP
    if (existingUser.otpExpires && existingUser.otpExpires < new Date()) {
      return ResponseApi.error(
        res,
        "Code OTP expiré. Demandez un nouveau code via resend-otp",
        {
          code: "OTP_EXPIRED",
          expiredAt: existingUser.otpExpires,
          hint: "Utilisez l'endpoint /resend-otp pour obtenir un nouveau code",
        },
        400
      );
    }

    if (!validateOTP(otp, existingUser.otp)) {
      return ResponseApi.error(res, "OTP invalide", null, 400);
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        otp: null,
        otpExpires: null, // Nettoyer l'expiration aussi
        otpAttempts: 0, // Réinitialiser le compteur de tentatives
        otpLastAttempt: null, // Réinitialiser le timestamp
        isVerified: true,
        status: "ACTIVE",
      },
    });

    // Créer notification de bienvenue
    await createNotification(
      user.id,
      "Bienvenue sur BuyAndSale",
      "Votre compte a été vérifié avec succès. Bienvenue !",
      {
        type: "WELCOME",
        link: "/",
      }
    );

    // Envoi du mail de bienvenue après vérification OTP
    try {
      // Import dynamique pour éviter les problèmes d'import circulaire
      const { createWelcomeTemplate } = await import(
        "../templates/welComeTemplate.js"
      );
      const htmlTemplate = createWelcomeTemplate(user.firstName, user.lastName);

      await sendEmail(
        user.email,
        "🎉 Bienvenue sur BuyAndSale !",
        `Bonjour ${user.firstName} ${user.lastName},\n\nVotre compte a été vérifié avec succès. Bienvenue sur BuyAndSale !`,
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

export const resendOTP = async (req: Request, res: Response): Promise<any> => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return ResponseApi.error(res, "UserId est requis", null, 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return ResponseApi.error(res, "Utilisateur non trouvé", null, 404);
    }

    if (user.isVerified) {
      return ResponseApi.error(res, "Compte déjà vérifié", null, 400);
    }

    // �️ PROTECTION: Vérifier les tentatives de renvoi OTP (3 max par heure)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const shouldResetAttempts =
      !user.otpLastAttempt || user.otpLastAttempt < oneHourAgo;

    if (shouldResetAttempts) {
      // Réinitialiser le compteur si plus d'1 heure s'est écoulée
      await prisma.user.update({
        where: { id: userId },
        data: {
          otpAttempts: 0,
          otpLastAttempt: new Date(),
        },
      });
    } else if (user.otpAttempts >= 3) {
      // Limite de 3 tentatives par heure atteinte
      const timeLeft = Math.ceil(
        (user.otpLastAttempt!.getTime() + 60 * 60 * 1000 - Date.now()) /
          1000 /
          60
      );
      return ResponseApi.error(
        res,
        `Limite de tentatives atteinte (3 max par heure). Réessayez dans ${timeLeft} minutes`,
        {
          code: "OTP_ATTEMPT_LIMIT_EXCEEDED",
          attemptsUsed: user.otpAttempts,
          maxAttempts: 3,
          resetInMinutes: timeLeft,
          nextAttemptAt: new Date(
            user.otpLastAttempt!.getTime() + 60 * 60 * 1000
          ),
        },
        429
      );
    }

    // �🔐 SÉCURITÉ: Vérifier si un OTP a été récemment envoyé (limite 1 minute)
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    if (user.updatedAt && user.updatedAt > oneMinuteAgo) {
      return ResponseApi.error(
        res,
        "Veuillez attendre 1 minute avant de demander un nouveau code",
        null,
        429
      );
    }

    // 🔢 GÉNÉRATION D'UN NOUVEAU CODE OTP
    const otp = generateOTP();

    // 📱 ENVOI PAR SMS EN PRIORITÉ
    const smsSent = await sendSMS(
      user.phone!,
      `Votre nouveau code OTP est: ${otp}`
    );

    // Log OTP en développement pour faciliter les tests
    if (process.env.NODE_ENV === "development") {
      console.log(`🔄 Nouveau OTP pour ${user.phone}: ${otp}`);
    }

    // 📧 FALLBACK EMAIL SI SMS ÉCHOUE
    if (!smsSent && user.email) {
      const htmlTemplate = createOTPEmailTemplate(
        user.firstName,
        user.lastName,
        otp
      );

      await sendEmail(
        user.email,
        "🔄 Nouveau code de vérification BuyAndSale",
        `Bonjour ${user.firstName} ${user.lastName},\n\nVotre nouveau code OTP est: ${otp}\n\nCe code remplace le précédent.`,
        htmlTemplate
      );
    }

    // 💾 MISE À JOUR EN BASE DE DONNÉES
    await prisma.user.update({
      where: { id: userId },
      data: {
        otp,
        otpExpires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes d'expiration
        otpAttempts: shouldResetAttempts ? 1 : (user.otpAttempts || 0) + 1, // Incrémenter ou réinitialiser
        otpLastAttempt: new Date(), // Mettre à jour le timestamp de la dernière tentative
        updatedAt: new Date(), // Important pour le rate limiting
      },
    });

    // 📊 LOG POUR MONITORING
    console.log(
      `✅ [ResendOTP] Nouveau code envoyé pour utilisateur ${userId}:`,
      {
        phone: user.phone,
        email: user.email,
        method: smsSent ? "SMS" : "EMAIL",
        timestamp: new Date().toISOString(),
      }
    );

    return ResponseApi.success(
      res,
      smsSent
        ? "Nouveau code OTP envoyé par SMS"
        : "Nouveau code OTP envoyé par email",
      {
        userId: user.id,
        method: smsSent ? "SMS" : "EMAIL",
      },
      200
    );
  } catch (error: any) {
    console.error("❌ Erreur lors du renvoi OTP:", error);
    return ResponseApi.error(
      res,
      "Une erreur est survenue lors du renvoi de l'OTP",
      error.message,
      500
    );
  }
};

export const login = async (req: Request, res: Response): Promise<any> => {
  try {
    // 🔐 VALIDATION SÉCURISÉE DES DONNÉES DE CONNEXION
    const validation = validateLoginData(req.body);
    if (!validation.isValid) {
      return ResponseApi.error(
        res,
        validation.message || "Données de connexion invalides",
        null,
        400
      );
    }

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

    // 🔐 GÉNÉRATION DES TOKENS D'AUTHENTIFICATION
    const AccessToken = generateToken({
      id: user.id,
      email: user.email,
    });

    const refreshToken = generateRefreshToken({
      id: user.id,
      email: user.email,
    });

    // 🎯 GESTION MULTI-DEVICE POUR LOGIN NORMAL
    // Stratégie: Préserver les sessions existantes, créer une nouvelle seulement si nécessaire
    const shouldCreateNewSession = !user.refreshToken;

    if (shouldCreateNewSession) {
      // Première connexion ou pas de session active → créer une nouvelle session
      await prisma.user.update({
        where: { id: user.id },
        data: {
          refreshToken,
          lastConnexion: new Date(),
        },
      });
    } else {
      // Session existante → juste mettre à jour la dernière connexion
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastConnexion: new Date(),
        },
      });
    }

    // 📊 EXTRACTION DES DONNÉES UTILISATEUR (sans le mot de passe)
    const { password: _, ...userData } = user;

    // 🔑 EXTRACTION DES PERMISSIONS ET RÔLES
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

    // 🔄 DÉDUPLICATION DES PERMISSIONS
    const uniquePermissions = Array.from(
      new Map(
        permissions.map((permission) => {
          return [permission.permissionKey, permission];
        })
      ).values()
    );

    // 📤 RÉPONSE DE CONNEXION RÉUSSIE
    return ResponseApi.success(res, "Connexion réussie", {
      token: {
        type: "Bearer",
        AccessToken,
        refreshToken: shouldCreateNewSession ? refreshToken : user.refreshToken, // Utiliser le token approprié
      },
      user: userData,
    });
  } catch (error: any) {
    // 🚨 GESTION D'ERREURS DÉTAILLÉE
    console.error("❌ Erreur lors de la connexion:", {
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      userAgent: req.get("User-Agent"),
      ip: req.ip || req.connection.remoteAddress,
    });

    // Gestion d'erreurs spécifiques
    if (error.code === "P2002") {
      // Erreur de contrainte unique Prisma
      return ResponseApi.error(
        res,
        "Conflit de données lors de la connexion",
        "Un problème de données a été détecté",
        409
      );
    }

    if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
      // Erreur de base de données
      return ResponseApi.error(
        res,
        "Service temporairement indisponible",
        "Problème de connexion à la base de données",
        503
      );
    }

    if (error.name === "ValidationError") {
      // Erreur de validation
      return ResponseApi.error(res, "Données invalides", error.message, 400);
    }

    // Erreur générique
    return ResponseApi.error(
      res,
      "Une erreur interne est survenue lors de la connexion",
      process.env.NODE_ENV === "development" ? error.message : "Erreur serveur",
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
    // 🔐 SUPPORT MULTI-SOURCE POUR REFRESH TOKEN
    // Essayer de récupérer le refresh token depuis plusieurs sources
    const { jwt: cookieToken } = req.cookies || {};
    const { refreshToken: bodyToken } = req.body || {};
    const refreshToken = bodyToken || cookieToken;

    if (!refreshToken) {
      return ResponseApi.error(
        res,
        "Aucun refresh token fourni",
        {
          code: "NO_REFRESH_TOKEN",
          sources: {
            cookie: !!cookieToken,
            body: !!bodyToken,
          },
        },
        400
      );
    }

    // Vérifier et décoder le refresh token
    const decoded = verifyToken(refreshToken);
    if (!decoded) {
      return ResponseApi.error(
        res,
        "Refresh token invalide",
        {
          code: "INVALID_REFRESH_TOKEN",
        },
        400
      );
    }

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      return ResponseApi.error(
        res,
        "Utilisateur non trouvé",
        {
          code: "USER_NOT_FOUND",
        },
        404
      );
    }

    // 🔐 VALIDATION PERMISSIVE POUR MULTI-DEVICE
    // Stratégie: Accepter les anciens refresh tokens pour permettre plusieurs appareils connectés
    const storedToken = user.refreshToken;

    if (storedToken && storedToken !== refreshToken) {
      console.log(
        `ℹ️ [MultiDevice] Utilisateur ${user.id} utilise un ancien refresh token - Autorisé`
      );
      // ✅ On continue le processus (stratégie permissive pour multi-device)
    }

    // 🔄 GÉNÉRATION DU NOUVEAU ACCESS TOKEN
    const newAccessToken = generateToken({
      id: user.id,
      email: user.email,
    });

    // � ROTATION OPTIONNELLE DU REFRESH TOKEN
    // Générer un nouveau refresh token pour une sécurité renforcée
    const newRefreshToken = generateRefreshToken({
      id: user.id,
      email: user.email,
    });

    // � STRATÉGIE DE MISE À JOUR INTELLIGENTE
    // Mettre à jour seulement si:
    // - Pas de refresh token en base OU
    // - Token reçu via body (rotation explicite demandée)
    const shouldRotateToken = !user.refreshToken || !!bodyToken;

    if (shouldRotateToken) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          refreshToken: newRefreshToken,
          lastConnexion: new Date(),
        },
      });
    }

    // 🍪 MISE À JOUR DU COOKIE SI NÉCESSAIRE
    // Seulement si le token venait du cookie ET qu'on a fait une rotation
    if (cookieToken && shouldRotateToken) {
      res.cookie("jwt", newRefreshToken, {
        httpOnly: true,
        secure: env.nodeEnv === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
      });
    }

    // 📤 RÉPONSE AVEC LES NOUVEAUX TOKENS
    return ResponseApi.success(res, "Token rafraîchi avec succès", {
      token: {
        type: "Bearer",
        AccessToken: newAccessToken,
        // Inclure le nouveau refresh token seulement si rotation effectuée ET demandée via body
        ...(bodyToken &&
          shouldRotateToken && { RefreshToken: newRefreshToken }),
      },
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  } catch (error: any) {
    console.error("Erreur lors du refresh token:", error);

    // 🔐 GESTION SÉCURISÉE DES ERREURS
    if (error.name === "TokenExpiredError") {
      return ResponseApi.error(
        res,
        "Refresh token expiré",
        {
          code: "REFRESH_TOKEN_EXPIRED",
          expiredAt: error.expiredAt,
        },
        401
      );
    } else if (error.name === "JsonWebTokenError") {
      return ResponseApi.error(
        res,
        "Refresh token malformé",
        {
          code: "MALFORMED_REFRESH_TOKEN",
        },
        400
      );
    }

    return ResponseApi.error(
      res,
      "Erreur lors du rafraîchissement du token",
      {
        code: "REFRESH_ERROR",
        message: error.message,
      },
      500
    );
  }
};

/**
 * 🚪 DÉCONNEXION SÉCURISÉE DE L'UTILISATEUR
 *
 * Cette fonction gère la déconnexion en révoquant le refresh token
 * et en nettoyant les cookies de session.
 *
 * 📱 IMPACT MULTI-DEVICE:
 * La déconnexion révoque le refresh token principal, ce qui peut affecter
 * les autres sessions actives. C'est un comportement volontaire pour la sécurité.
 */
export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { jwt } = req.cookies;
    const refreshToken = jwt;

    // 🧹 NETTOYAGE SYSTÉMATIQUE DU COOKIE
    const clearCookieOptions = {
      httpOnly: true,
      secure: env.nodeEnv === "production",
      sameSite: "strict" as const,
    };

    // Si pas de refresh token, considérer comme déjà déconnecté
    if (!refreshToken) {
      res.clearCookie("jwt", clearCookieOptions);
      return ResponseApi.success(res, "Utilisateur déjà déconnecté", {}, 200);
    }

    // 🔍 RECHERCHE ET RÉVOCATION DU TOKEN
    const user = await prisma.user.findFirst({ where: { refreshToken } });

    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: null },
      });
      console.log(`✅ [Logout] Token révoqué pour utilisateur ${user.id}`);
    } else {
      console.log(`⚠️ [Logout] Aucun utilisateur trouvé pour ce refresh token`);
    }

    // 🧹 NETTOYAGE FINAL DU COOKIE
    res.clearCookie("jwt", clearCookieOptions);

    return ResponseApi.success(res, "Déconnexion réussie", {}, 200);
  } catch (error) {
    console.error("❌ [Logout] Erreur:", error);

    // 🛡️ NETTOYAGE DE SÉCURITÉ même en cas d'erreur
    res.clearCookie("jwt", {
      httpOnly: true,
      secure: env.nodeEnv === "production",
      sameSite: "strict",
    });

    return ResponseApi.success(
      res,
      "Déconnexion forcée (nettoyage sécurisé)",
      {},
      200
    );
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
    const userId = req.authUser?.id;

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

    // 🔧 Transformer les images des produits en URLs complètes
    const userWithImageUrls = {
      ...user,
      products:
        user.products?.map((product) => ({
          ...product,
          images: Array.isArray(product.images)
            ? (product.images as string[]).map((imagePath: string) =>
                Utils.resolveFileUrl(req, imagePath)
              )
            : [], // Tableau vide si pas d'images
        })) || [],
    };

    return ResponseApi.success(
      res,
      "Profil utilisateur récupéré avec succès",
      userWithImageUrls,
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

/**
 * Fonction de callback après authentification Google réussie
 */
export const googleCallback = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // L'utilisateur est disponible dans req.user grâce à passport
    const user = req.user as any;

    if (!user) {
      console.error("Aucun utilisateur trouvé dans req.user");
      res.redirect(`${env.frontendUrl}/auth/login?error=auth_failed`);
      return;
    }

    // 🔐 GÉNÉRATION DES TOKENS D'ACCÈS ET DE RAFRAÎCHISSEMENT
    const AccessToken = generateToken({
      id: user.id,
      email: user.email,
    });

    const newRefreshToken = generateRefreshToken({
      id: user.id,
      email: user.email,
    });

    // 🔐 GESTION MULTI-DEVICE: Vérifier l'état actuel des tokens
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { refreshToken: true },
    });

    // 🎯 STRATÉGIE MULTI-DEVICE SIMPLIFIÉE:
    // - Si aucun refresh token existant → utiliser le nouveau
    // - Si refresh token existant → le conserver pour permettre les sessions multiples
    const finalRefreshToken = currentUser?.refreshToken || newRefreshToken;
    const shouldUpdateToken = !currentUser?.refreshToken;

    // 📝 MISE À JOUR EN BASE: Seulement si nécessaire
    await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(shouldUpdateToken && { refreshToken: finalRefreshToken }),
        lastConnexion: new Date(),
      },
    });

    // 🍪 CONFIGURATION DU COOKIE DE SESSION
    res.cookie("jwt", finalRefreshToken, {
      httpOnly: true,
      secure: env.nodeEnv === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
    });

    console.log("✅ [GoogleAuth] Connexion réussie:", {
      id: user.id,
      email: user.email,
      tokenGenerated: true,
      sessionId: req.sessionID,
      isMultiDevice: !shouldUpdateToken, // Indique si c'est une session supplémentaire
      tokenStrategy: shouldUpdateToken ? "nouveau_token" : "token_existant",
    });

    // Rediriger vers le frontend avec le token en paramètre
    res.redirect(
      `${env.frontendUrl}/auth/social-callback?token=${encodeURIComponent(
        AccessToken
      )}`
    );
  } catch (error) {
    console.error("Erreur lors de la connexion Google:", error);

    // Détruire la session en cas d'erreur pour éviter les états incohérents
    if (req.session) {
      req.session.destroy((err) => {
        if (err)
          console.error("Erreur lors de la destruction de session:", err);
      });
    }

    res.redirect(`${env.frontendUrl}/auth/login?error=server_error`);
  }
};
