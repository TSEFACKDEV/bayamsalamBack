import { NextFunction, Request, Response } from 'express';
import ResponseApi from '../helper/response.js';
import env from '../config/config.js';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): any => {
  // 🔐 LOG SÉCURISÉ - Toujours logger les erreurs pour le debug
  console.error('=== ERREUR SERVEUR ===');
  console.error('Timestamp:', new Date().toISOString());
  console.error('URL:', req.method, req.url);
  console.error('Error:', err.message);

  // En développement, afficher la stack trace complète
  if (env.nodeEnv === 'development') {
    console.error('Stack trace:', err.stack);
  }
  console.error('=== FIN ERREUR ===');

  // 🛡️ RÉPONSES SÉCURISÉES - Ne pas exposer de détails sensibles

  // Erreurs de validation Yup
  if (err.name === 'ValidationError') {
    return ResponseApi.error(res, 'Données de validation invalides', null, 400);
  }

  // Erreurs JWT
  if (err.name === 'JsonWebTokenError') {
    return ResponseApi.error(res, 'Token invalide', null, 401);
  }
  if (err.name === 'TokenExpiredError') {
    return ResponseApi.error(res, 'Session expirée', null, 401);
  }

  // Erreurs Prisma (base de données)
  if (err.code === 'P2002') {
    return ResponseApi.error(res, 'Cette donnée existe déjà', null, 409);
  }
  if (err.code === 'P2025') {
    return ResponseApi.error(res, 'Ressource non trouvée', null, 404);
  }
  if (err.code && err.code.startsWith('P')) {
    return ResponseApi.error(res, 'Erreur de base de données', null, 500);
  }

  // Erreurs de syntaxe JSON
  if (err instanceof SyntaxError && 'body' in err) {
    return ResponseApi.error(res, 'Format de données invalide', null, 400);
  }

  // 🚨 ERREUR GÉNÉRIQUE - Ne jamais exposer les détails
  const isDev = env.nodeEnv === 'development';

  return ResponseApi.error(
    res,
    'Erreur interne du serveur',
    isDev
      ? {
          message: err.message,
          // En dev seulement, on peut donner plus de contexte
          type: err.name,
        }
      : null,
    500
  );
};
