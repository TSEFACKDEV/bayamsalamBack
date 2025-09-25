import { Request, Response } from 'express';
import ResponseApi from '../helper/response.js';
import { paymentService } from '../services/payment.service.js';
import { PaymentMethod } from '@prisma/client';
import { cacheService } from '../services/cache.service.js';
import prisma from '../model/prisma.client.js';
import { PHONE_REGEX } from '../services/forfait.service.js'; // ✅ Import regex unifiée

// Initier un paiement de forfait
export const initiatePayment = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.authUser?.id;
    const { productId, forfaitId, phoneNumber, paymentMethod } = req.body;

    if (!userId) {
      return ResponseApi.error(res, 'Utilisateur non authentifié', null, 401);
    }

    // Validation des données
    if (!productId || !forfaitId || !phoneNumber || !paymentMethod) {
      return ResponseApi.error(res, 'Tous les champs sont requis', null, 400);
    }

    if (!['MOBILE_MONEY', 'ORANGE_MONEY'].includes(paymentMethod)) {
      return ResponseApi.error(res, 'Méthode de paiement non supportée', null, 400);
    }

    // ✅ VALIDATION UNIFIÉE du numéro de téléphone
    const cleanPhone = phoneNumber.replace(/\s+/g, '');
    if (!PHONE_REGEX.test(cleanPhone)) {
      return ResponseApi.error(res, 'Numéro de téléphone invalide (format: 237XXXXXXXX ou XXXXXXXX)', null, 400);
    }

    const result = await paymentService.initiatePayment(
      userId,
      productId,
      forfaitId,
      cleanPhone,
      paymentMethod as PaymentMethod
    );

    ResponseApi.success(res, 'Paiement initié avec succès', {
      paymentId: result.payment.id,
      amount: result.payment.amount,
      status: result.payment.status,
      campayReference: result.payment.campayReference,
      ussdCode: result.campayResponse?.ussd_code,
      instructions: 'Composez le code USSD pour finaliser le paiement',
    });

  } catch (error: any) {
    ResponseApi.error(res, 'Erreur lors de l\'initiation du paiement', error.message);
  }
};

// Vérifier le statut d'un paiement (méthode améliorée)
export const checkPaymentStatus = async (req: Request, res: Response): Promise<any> => {
  try {
    const { paymentId } = req.params;
    const userId = req.authUser?.id;

    if (!userId) {
      return ResponseApi.error(res, 'Utilisateur non authentifié', null, 401);
    }

    const payment = await paymentService.checkPaymentStatus(paymentId);

    if (payment.userId !== userId) {
      return ResponseApi.error(res, 'Accès non autorisé', null, 403);
    }

    // Invalider le cache si le paiement est réussi
    if (payment.status === 'SUCCESS') {
      cacheService.invalidateHomepageProducts();
    }

    // Vérifier si le forfait a été activé
    let forfaitActivated = false;
    if (payment.status === 'SUCCESS') {
      const activeForfait = await prisma.productForfait.findFirst({
        where: {
          productId: payment.productId,
          forfaitId: payment.forfaitId,
          isActive: true,
          expiresAt: { gt: new Date() }
        }
      });
      forfaitActivated = !!activeForfait;
    }

    ResponseApi.success(res, 'Statut du paiement récupéré', {
      paymentId: payment.id,
      status: payment.status,
      amount: payment.amount,
      paidAt: payment.paidAt,
      forfaitActivated, // ✅ Nouvelle information
      forfait: payment.forfait,
      product: {
        id: payment.product.id,
        name: payment.product.name,
      },
    });

  } catch (error: any) {
    ResponseApi.error(res, 'Erreur lors de la vérification du paiement', error.message);
  }
};

// Obtenir l'historique des paiements
export const getUserPayments = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.authUser?.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!userId) {
      return ResponseApi.error(res, 'Utilisateur non authentifié', null, 401);
    }

    const result = await paymentService.getUserPayments(userId, page, limit);

    ResponseApi.success(res, 'Historique des paiements récupéré', result);

  } catch (error: any) {
    ResponseApi.error(res, 'Erreur lors de la récupération des paiements', error.message);
  }
};

// Webhook pour recevoir les notifications de Campay (amélioré)
export const campayWebhook = async (req: Request, res: Response): Promise<any> => {
  try {
    console.log('🔔 Webhook Campay reçu:', req.body);
    
    const { reference, status, external_reference, operator_reference } = req.body;

    if (!external_reference) {
      return ResponseApi.error(res, 'Référence externe manquante', null, 400);
    }

    // Mettre à jour le statut du paiement automatiquement
    const payment = await paymentService.checkPaymentStatus(external_reference);
    
    console.log(`✅ Webhook traité - Payment ${external_reference} status: ${payment.status}`);

    // Répondre rapidement à Campay
    ResponseApi.success(res, 'Webhook traité avec succès', {
      paymentId: external_reference,
      status: payment.status
    });

  } catch (error: any) {
    console.error('❌ Erreur webhook Campay:', error);
    ResponseApi.error(res, 'Erreur lors du traitement du webhook', error.message);
  }
};