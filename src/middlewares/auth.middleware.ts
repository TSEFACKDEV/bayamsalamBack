import { NextFunction, Request, Response } from "express";
import ResponseApi from "../helper/response.js";
import jwt from "jsonwebtoken";
import env from "../config/config.js";
import prisma from "../model/prisma.client.js";

//Middlewqre pour verifier si l'utilisateur est authentifier
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return ResponseApi.notFound(res, "Authentification required");
    }
    const decoded = jwt.verify(token, env.jwtSecret) as {
      id: string;
      role: string;
    };

    //  console.log('====================================');
    // console.log("decoded", decoded);
    // console.log('====================================');
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });
    if (!user) {
      return ResponseApi.notFound(res, "User not Found");
    }

    // console.log('====================================');
    // console.log(user);
    // console.log('====================================');
    req.user = user;
    next();
  } catch (error) {
    return ResponseApi.notFound(res, "Invalid Token");
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
