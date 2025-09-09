import { NextFunction, Request, Response } from "express";
import ResponseApi from "../helper/response.js";
import jwt from "jsonwebtoken";
import env from "../config/config.js";
import prisma from "../model/prisma.client.js";

//Middleware pour verifier si l'utilisateur est authentifier
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    // Récupérer le token de l'en-tête Authorization
    const authHeader = req.header("Authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7) // Enlever "Bearer " pour obtenir le token
      : authHeader; // Utiliser le token tel quel s'il n'y a pas "Bearer "

    if (!token) {
      return ResponseApi.error(res, "Utilisateur non authentifié", null, 401);
    }

    // Décoder le token JWT
    const decoded = jwt.verify(token, env.jwtSecret) as {
      id: string;
      email: string;
    };

    // console.log('====================================');
    // console.log("Token decoded:", decoded);
    // console.log('====================================');

    // Récupérer l'utilisateur à partir de l'ID dans le token
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      return ResponseApi.error(res, "Utilisateur non trouvé", null, 404);
    }

    // Attacher l'utilisateur à la requête pour les contrôleurs
    req.authUser = user;
    next();
  } catch (error) {
    console.error("Erreur d'authentification:", error);
    return ResponseApi.error(res, "Utilisateur non authentifié", null, 401);
  }
};

//Middleware pour verifier si un utilisateur a l'authorization de faire certaine taches
export const isAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const token = req.headers.authorization; // Prend le token tel quel, sans "Bearer "

  if (!token) {
    ResponseApi.notFound(res, "Token manquant ou invalide");
    return;
  }

  try {
    const decoded: any = jwt.verify(token, env.jwtSecret);

    // Vérifie si l'utilisateur a le rôle admin
    if (decoded.role !== "ADMIN") {
      ResponseApi.notFound(res, "Accès refusé : utilisateur non autorisé");
      return;
    }

    req.user = decoded;
    next();
  } catch (error) {
    ResponseApi.notFound(res, "Token invalide ou expiré");
  }
};
