import { paymentService } from './payment.service.js';
import prisma from '../model/prisma.client.js';

class PaymentCheckerService {
  private isRunning: boolean = false;

  private async ensureDatabaseConnection() {
    try {
      await prisma.$connect();
    } catch (error) {
      console.error('❌ Erreur de reconnexion à la base de données:', error);
      throw error;
    }
  }

  // Vérifier automatiquement les paiements en attente
  async checkPendingPayments(): Promise<void> {
    if (this.isRunning) {
      console.log('🔄 Vérification déjà en cours, ignoré');
      return;
    }

    this.isRunning = true;
    console.log('🔍 Début de la vérification des paiements en attente...');

    try {
      // 🔗 Vérifier la connexion avant la requête
      await this.ensureDatabaseConnection();
      
      // Récupérer tous les paiements en attente créés dans les dernières 24h
      const pendingPayments = await prisma.payment.findMany({
        where: {
          status: 'PENDING',
          campayReference: { not: null },
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24h
          }
        },
        include: {
          forfait: true,
          product: true,
          user: true
        }
      });

      console.log(`📊 ${pendingPayments.length} paiements en attente trouvés`);

      // Vérifier chaque paiement
      for (const payment of pendingPayments) {
        try {
          console.log(`🔍 Vérification du paiement: ${payment.id}`);
          await paymentService.checkPaymentStatus(payment.id);
          
          // Petit délai pour éviter de surcharger l'API Campay
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error: any) {
          console.error(`❌ Erreur lors de la vérification du paiement ${payment.id}:`, error.message);
        }
      }

      console.log('✅ Vérification des paiements terminée');
    } catch (error: any) {
      console.error('❌ Erreur générale lors de la vérification:', error);
    } finally {
      this.isRunning = false;
    }
  }

  // Démarrer la vérification périodique
  startPeriodicCheck(intervalMinutes: number = 5): void {
    console.log(`🕐 Démarrage de la vérification automatique (toutes les ${intervalMinutes} minutes)`);
    
    // Vérification immédiate
    this.checkPendingPayments();
    
    // Puis vérification périodique
    setInterval(() => {
      this.checkPendingPayments();
    }, intervalMinutes * 60 * 1000);
  }

  // Nettoyer les anciens paiements expirés
  async cleanupExpiredPayments(): Promise<void> {
    try {
      const expiredPayments = await prisma.payment.updateMany({
        where: {
          status: 'PENDING',
          createdAt: {
            lt: new Date(Date.now() - 48 * 60 * 60 * 1000) // 48h
          }
        },
        data: {
          status: 'EXPIRED',
          failureReason: 'Paiement expiré après 48 heures'
        }
      });

      console.log(`🧹 ${expiredPayments.count} paiements expirés nettoyés`);
    } catch (error: any) {
      console.error('❌ Erreur lors du nettoyage:', error);
    }
  }
}

export const paymentCheckerService = new PaymentCheckerService();