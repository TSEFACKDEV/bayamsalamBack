import { Request, Response } from 'express';
import ResponseApi from '../helper/response.js';
import { cacheService } from '../services/cache.service.js';

/**
 * 📊 Contrôleur pour la gestion et le monitoring du cache
 */

/**
 * GET /api/cache/stats
 * Récupère les statistiques détaillées du cache
 */
export const getCacheStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const stats = cacheService.getStats();

    ResponseApi.success(res, 'Statistiques du cache récupérées', {
      ...stats,
      hitRate: `${stats.hitRate}%`,
      memoryUsage: `${(stats.vsize / 1024).toFixed(2)} KB`,
      efficiency:
        stats.hitRateNumeric > 70
          ? 'Excellent'
          : stats.hitRateNumeric > 50
            ? 'Bon'
            : 'À améliorer',
    });
  } catch (error: any) {
    ResponseApi.error(
      res,
      'Erreur lors de la récupération des statistiques du cache',
      error.message
    );
  }
};

/**
 * DELETE /api/cache/flush
 * Vide complètement le cache
 */
export const flushCache = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    cacheService.flush();
    ResponseApi.success(res, 'Cache vidé avec succès', null);
  } catch (error: any) {
    ResponseApi.error(res, 'Erreur lors du vidage du cache', error.message);
  }
};

/**
 * POST /api/cache/cleanup
 * Nettoie les entrées expirées du cache
 */
export const cleanupCache = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const deletedCount = cacheService.cleanupExpired();
    ResponseApi.success(res, 'Nettoyage du cache effectué', {
      deletedEntries: deletedCount,
    });
  } catch (error: any) {
    ResponseApi.error(res, 'Erreur lors du nettoyage du cache', error.message);
  }
};
