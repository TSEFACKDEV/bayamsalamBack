import * as cron from "node-cron";
import prisma from "../model/prisma.client.js";
import { createNotification } from "./notification.service.js";
import { cacheService } from "./cache.service.js";

/**
 * Service simple pour la gestion automatique des forfaits
 * - Vérification quotidienne des forfaits qui expirent dans 24h (avertissement)
 * - Notification et nettoyage des forfaits expirés
 */
export class ForfaitSchedulerService {
  private static isRunning = false;

  /**
   * Démarre le service de surveillance des forfaits
   * Exécute une vérification quotidienne à minuit
   */
  static start() {
    console.log(
      "🚀 ForfaitScheduler: Démarrage du service de surveillance des forfaits"
    );

    // Cron job quotidien à minuit (0 0 * * *)
    cron.schedule("0 0 * * *", async () => {
      if (this.isRunning) {
        console.log(
          "⚠️ ForfaitScheduler: Vérification déjà en cours, passage ignoré"
        );
        return;
      }

      this.isRunning = true;
      console.log(
        "🔍 ForfaitScheduler: Début de la vérification quotidienne des forfaits"
      );

      try {
        await this.checkForfaitsExpiration();
        console.log(
          "✅ ForfaitScheduler: Vérification quotidienne terminée avec succès"
        );
      } catch (error) {
        console.error(
          "❌ ForfaitScheduler: Erreur lors de la vérification:",
          error
        );
      } finally {
        this.isRunning = false;
      }
    });

    console.log("⏰ ForfaitScheduler: Cron job quotidien configuré (minuit)");
  }

  /**
   * Vérification principale des forfaits
   * 1. Avertissement pour forfaits qui expirent dans 24h
   * 2. Notification + nettoyage pour forfaits expirés
   */
  private static async checkForfaitsExpiration() {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // 1️⃣ AVERTISSEMENT: Forfaits qui expirent dans 24h
    await this.notifyExpiringSoon(now, tomorrow);

    // 2️⃣ EXPIRATION: Forfaits déjà expirés
    await this.handleExpiredForfaits(now);

    // 3️⃣ CACHE: Invalider le cache après modifications
    cacheService.invalidateHomepageProducts();
  }

  /**
   * Notifie les utilisateurs dont les forfaits expirent dans 24h
   */
  private static async notifyExpiringSoon(now: Date, tomorrow: Date) {
    try {
      const expiringSoonForfaits = await prisma.productForfait.findMany({
        where: {
          isActive: true,
          expiresAt: {
            gt: now, // Pas encore expiré
            lte: tomorrow, // Expire dans les 24h
          },
        },
        include: {
          product: {
            include: { user: true },
          },
          forfait: true,
        },
      });

      console.log(
        `📢 ForfaitScheduler: ${expiringSoonForfaits.length} forfait(s) expirent dans 24h`
      );

      for (const productForfait of expiringSoonForfaits) {
        if (productForfait.product?.user?.id) {
          await createNotification(
            productForfait.product.user.id,
            "⏰ Forfait expire bientôt",
            `Votre forfait ${productForfait.forfait.type} pour l'annonce "${productForfait.product.name}" expire demain.`,
            {
              type: "PRODUCT_FORFAIT",
              link: `/annonce/${productForfait.productId}`,
            }
          );
        }
      }
    } catch (error) {
      console.error(
        "❌ ForfaitScheduler: Erreur lors des notifications d'expiration prochaine:",
        error
      );
    }
  }

  /**
   * Gère les forfaits expirés : notification + nettoyage
   */
  private static async handleExpiredForfaits(now: Date) {
    try {
      const expiredForfaits = await prisma.productForfait.findMany({
        where: {
          isActive: true,
          expiresAt: {
            lte: now, // Déjà expiré
          },
        },
        include: {
          product: {
            include: { user: true },
          },
          forfait: true,
        },
      });

      console.log(
        `🔄 ForfaitScheduler: ${expiredForfaits.length} forfait(s) expirés à nettoyer`
      );

      for (const productForfait of expiredForfaits) {
        // Notifier l'utilisateur de l'expiration
        if (productForfait.product?.user?.id) {
          await createNotification(
            productForfait.product.user.id,
            "⚠️ Forfait expiré",
            `Votre forfait ${productForfait.forfait.type} pour l'annonce "${productForfait.product.name}" a expiré.`,
            {
              type: "PRODUCT_FORFAIT",
              link: `/annonce/${productForfait.productId}`,
            }
          );
        }

        // Désactiver le forfait expiré
        await prisma.productForfait.update({
          where: { id: productForfait.id },
          data: {
            isActive: false,
            deactivatedAt: now,
          },
        });
      }
    } catch (error) {
      console.error(
        "❌ ForfaitScheduler: Erreur lors du nettoyage des forfaits expirés:",
        error
      );
    }
  }

  /**
   * Méthode pour tests ou exécution manuelle
   */
  static async runManualCheck() {
    if (this.isRunning) {
      console.log("⚠️ ForfaitScheduler: Vérification déjà en cours");
      return;
    }

    this.isRunning = true;
    console.log("🔧 ForfaitScheduler: Exécution manuelle de la vérification");

    try {
      await this.checkForfaitsExpiration();
      console.log("✅ ForfaitScheduler: Vérification manuelle terminée");
    } catch (error) {
      console.error(
        "❌ ForfaitScheduler: Erreur lors de la vérification manuelle:",
        error
      );
      throw error;
    } finally {
      this.isRunning = false;
    }
  }
}
