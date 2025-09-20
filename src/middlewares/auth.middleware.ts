/**
 * 🔐 MIDDLEWARES D'AUTHENTIFICATION ET D'AUTORISATION - BuyAndSale
 *
 * Ce module contient les middlewares de sécurité pour:
 * - Vérification de l'authentification (JWT access tokens)
 * - Vérification des autorisations (rôles SUPER_ADMIN)
 *
 * 🎯 STRATÉGIE DE SÉCURITÉ:
 * - Validation stricte des tokens JWT
 * - Gestion détaillée des erreurs (token expiré, invalide, etc.)
 * - Vérification des rôles basée sur la base de données (sécurité renforcée)
 * - Support des formats Bearer token flexible
 */

import { NextFunction, Request, Response } from "express";
import ResponseApi from "../helper/response.js";
import jwt from "jsonwebtoken";
import env from "../config/config.js";
import prisma from "../model/prisma.client.js";

/**
 * 🔑 MIDDLEWARE D'AUTHENTIFICATION
 *
 * Vérifie la validité du token JWT et attache l'utilisateur à la requête.
 * Compatible avec les tokens envoyés via header Authorization.
 *
 * @param req - Requête Express
 * @param res - Réponse Express
 * @param next - Fonction next pour continuer le pipeline
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    // 📡 EXTRACTION DU TOKEN DEPUIS L'EN-TÊTE AUTHORIZATION
    const authHeader = req.header("Authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7) // Format: "Bearer <token>"
      : authHeader; // Format direct: "<token>"

    if (!token) {
      return ResponseApi.error(
        res,
        "Token d'authentification requis",
        {
          code: "NO_TOKEN",
        },
        401
      );
    }

    // 🔓 DÉCODAGE ET VALIDATION DU TOKEN JWT
    const decoded = jwt.verify(token, env.jwtSecret) as {
      id: string;
      email: string;
    };

    // 👤 RÉCUPÉRATION DES DONNÉES UTILISATEUR AVEC RÔLES
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
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

    if (!user.isVerified) {
      return ResponseApi.error(
        res,
        "Compte non vérifié",
        {
          code: "ACCOUNT_NOT_VERIFIED",
        },
        403
      );
    }

    if (user.status !== "ACTIVE") {
      return ResponseApi.error(
        res,
        "Compte suspendu ou inactif",
        {
          code: "ACCOUNT_INACTIVE",
          status: user.status,
        },
        403
      );
    }

    // ✅ AUTHENTIFICATION RÉUSSIE
    req.authUser = user;
    next();
  } catch (error: any) {
    console.error("❌ [Auth] Erreur d'authentification:", error.message);

    // � GESTION DÉTAILLÉE DES ERREURS JWT
    if (error.name === "TokenExpiredError") {
      return ResponseApi.error(
        res,
        "Token expiré",
        {
          code: "TOKEN_EXPIRED",
          expiredAt: error.expiredAt,
          hint: "Utilisez le refresh token pour obtenir un nouveau token d'accès",
        },
        401
      );
    }

    if (error.name === "JsonWebTokenError") {
      return ResponseApi.error(
        res,
        "Token malformé ou invalide",
        {
          code: "TOKEN_INVALID",
        },
        401
      );
    }

    if (error.name === "NotBeforeError") {
      return ResponseApi.error(
        res,
        "Token pas encore actif",
        {
          code: "TOKEN_NOT_ACTIVE",
        },
        401
      );
    }

    // 🚨 ERREUR D'AUTHENTIFICATION GÉNÉRIQUE
    return ResponseApi.error(
      res,
      "Échec de l'authentification",
      {
        code: "AUTH_ERROR",
      },
      401
    );
  }
};

/**
 * 🛡️ MIDDLEWARE D'AUTORISATION ADMIN
 *
 * Vérifie que l'utilisateur authentifié possède le rôle SUPER_ADMIN.
 * Ce middleware doit être utilisé après le middleware authenticate.
 *
 * 🔒 SÉCURITÉ RENFORCÉE:
 * - Vérification des rôles basée sur la base de données (pas sur le token)
 * - Protection contre les attaques de manipulation de tokens
 * - Validation complète de l'utilisateur et de ses permissions
 *
 * @param req - Requête Express
 * @param res - Réponse Express
 * @param next - Fonction next pour continuer le pipeline
 */
export const isAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    // 📡 EXTRACTION DU TOKEN (même logique que authenticate)
    const authHeader = req.header("Authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7)
      : authHeader;

    if (!token) {
      return ResponseApi.error(
        res,
        "Token d'authentification requis",
        {
          code: "NO_TOKEN",
        },
        401
      );
    }

    // 🔓 DÉCODAGE DU TOKEN
    const decoded = jwt.verify(token, env.jwtSecret) as {
      id: string;
      email: string;
    };

    // 👤 RÉCUPÉRATION COMPLÈTE DE L'UTILISATEUR AVEC SES RÔLES
    const userWithRoles = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!userWithRoles) {
      return ResponseApi.error(
        res,
        "Utilisateur non trouvé",
        {
          code: "USER_NOT_FOUND",
        },
        404
      );
    }

    if (!userWithRoles.isVerified) {
      return ResponseApi.error(
        res,
        "Compte non vérifié",
        {
          code: "ACCOUNT_NOT_VERIFIED",
        },
        403
      );
    }

    if (userWithRoles.status !== "ACTIVE") {
      return ResponseApi.error(
        res,
        "Compte suspendu ou inactif",
        {
          code: "ACCOUNT_INACTIVE",
          status: userWithRoles.status,
        },
        403
      );
    }

    // 🔍 VÉRIFICATION DU RÔLE SUPER_ADMIN
    const hasAdminRole = userWithRoles.roles.some(
      (userRole: any) => userRole.role.name === "SUPER_ADMIN"
    );

    if (!hasAdminRole) {
      const userRoles = userWithRoles.roles.map((ur) => ur.role.name);
      return ResponseApi.error(
        res,
        "Accès refusé : privilèges administrateur requis",
        {
          code: "INSUFFICIENT_PRIVILEGES",
          userRoles,
          requiredRole: "SUPER_ADMIN",
        },
        403
      );
    }

    // ✅ AUTORISATION ACCORDÉE
    req.authUser = userWithRoles;
    next();
  } catch (error: any) {
    console.error("❌ [Admin] Erreur d'autorisation:", error.message);

    // 🔍 GESTION DES ERREURS JWT (similaire à authenticate)
    if (error.name === "TokenExpiredError") {
      return ResponseApi.error(
        res,
        "Token expiré",
        {
          code: "TOKEN_EXPIRED",
          expiredAt: error.expiredAt,
        },
        401
      );
    }

    if (error.name === "JsonWebTokenError") {
      return ResponseApi.error(
        res,
        "Token malformé ou invalide",
        {
          code: "TOKEN_INVALID",
        },
        401
      );
    }

    return ResponseApi.error(
      res,
      "Échec de la vérification des autorisations",
      {
        code: "AUTHORIZATION_ERROR",
      },
      401
    );
  }
};
