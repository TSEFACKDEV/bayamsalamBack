import { NextFunction, Request, Response } from "express";
import ResponseApi from "../helper/response.js";

export const errorHandler = (err: any, req:Request, res: Response, next:NextFunction): any  => {
        console.log(err.stack)

         // Erreurs de validation Yup
  if (err.name === 'ValidationError') {
    return ResponseApi.error(res,'Validation failed', err.errors);
  }

  // Erreurs JWT
  if (err.name === 'JsonWebTokenError') {
    return ResponseApi.error(res, 'Invalid token', err.errors);
  }
  if (err.name === 'TokenExpiredError') {
    return ResponseApi.error(res,'Token expired', null);
  }

  // Erreur Prisma
  if (err.code === 'P2002') {
    return ResponseApi.error(res, 'Duplicate field value', null);
  }
  if (err.code === 'P2025') {
    return ResponseApi.error(res,'Record not found', null);
  }

  // Erreur par défaut
  return ResponseApi.error(res, 'Internal server error',  err);
}