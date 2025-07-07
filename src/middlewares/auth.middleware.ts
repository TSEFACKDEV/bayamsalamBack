import { NextFunction, Request, Response } from "express";
import ResponseApi from "../helper/response";
import jwt from "jsonwebtoken";
import env from "../config/config";
import prisma from "../model/prisma.client";

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
    const user = prisma.user.findUnique({
      where: { id: decoded.id },
    });
    if (!user) {
      return ResponseApi.notFound(res, "User not Found");
    }
    req.user = user;
    next();
  } catch (error) {
    console.log("====================================");
    console.log(error);
    console.log("====================================");
    ResponseApi.notFound(res, "Invalid Token");
  }
};

//Middleware pour verifier si un utilisateur a l'authorization de faire certaine taches
export const isAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): any => {
  if (req.user?.role !== "ADMIN") {
    return res.status(403).json({ message: "Accès refusé" });
  }
  next();
};
