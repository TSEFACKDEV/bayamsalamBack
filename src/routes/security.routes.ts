/**
 * 🔐 ROUTES DE MONITORING DE SÉCURITÉ - BuyAndSale
 *
 * Endpoints sécurisés pour la surveillance et l'analyse des événements de sécurité
 * Accès réservé aux super administrateurs uniquement
 */

import { Router } from 'express';
import {
  getSecurityStatistics,
  getRecentSecurityEvents,
  analyzeIP,
} from '../controllers/security.controller.js';
import { isAdmin } from '../middlewares/auth.middleware.js';
import { generalRateLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

/**
 * 📊 STATISTIQUES GÉNÉRALES DE SÉCURITÉ
 *
 * GET /api/bayamsalam/security/stats
 *
 * Retourne un aperçu complet de la sécurité :
 * - Nombre total d'attaques détectées
 * - Types d'attaques les plus fréquents
 * - IPs suspectes
 * - Score de sécurité global
 * - Recommandations
 */
router.get(
  '/stats',
  generalRateLimiter,
  isAdmin, // 🔒 Super Admin uniquement
  getSecurityStatistics
);

/**
 * 📋 ÉVÉNEMENTS DE SÉCURITÉ RÉCENTS
 *
 * GET /api/bayamsalam/security/events
 *
 * Query parameters:
 * - limit: nombre d'événements à retourner (défaut: 50)
 * - offset: décalage pour la pagination (défaut: 0)
 *
 * Retourne la liste des tentatives d'attaque récentes avec :
 * - Type d'événement
 * - Timestamp
 * - IP source
 * - Utilisateur (si connecté)
 * - Sévérité
 * - Détails de l'attaque
 */
router.get(
  '/events',
  generalRateLimiter,
  isAdmin, // 🔒 Super Admin uniquement
  getRecentSecurityEvents
);

/**
 * 🎯 ANALYSE D'UNE IP SPÉCIFIQUE
 *
 * GET /api/bayamsalam/security/ip/:ip
 *
 * Analyse détaillée d'une adresse IP :
 * - Historique des requêtes
 * - Événements de sécurité
 * - Score de risque
 * - Recommandations d'action
 * - Timeline des activités
 */
router.get(
  '/ip/:ip',
  generalRateLimiter,
  isAdmin, // 🔒 Super Admin uniquement
  analyzeIP
);

export default router;
