import express from 'express';
import {
  getCacheStats,
  flushCache,
  cleanupCache,
} from '../controllers/cache.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import checkPermission from '../middlewares/checkPermission.js';

const router = express.Router();

/**
 * 📊 Routes de monitoring et gestion du cache
 * Accessible uniquement aux administrateurs
 */

// Statistiques du cache (lecture)
router.get(
  '/stats',
  authenticate,
  checkPermission('ADMIN_READ'), // Seuls les admins peuvent voir les stats
  getCacheStats
);

// Nettoyage sélectif du cache
router.post(
  '/cleanup',
  authenticate,
  checkPermission('ADMIN_WRITE'), // Requiert permissions d'écriture admin
  cleanupCache
);

// Vidage complet du cache (action critique)
router.delete(
  '/flush',
  authenticate,
  checkPermission('ADMIN_WRITE'), // Action sensible, réservée aux admins
  flushCache
);

export default router;
