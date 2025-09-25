import axios from 'axios';
import config from '../config/config.js';
import prisma from '../model/prisma.client.js';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { cacheService } from './cache.service.js';
import { PHONE_REGEX } from './forfait.service.js'; // ✅ Import regex unifiée

interface CampayTokenResponse {
  token: string;
  expires_in: number;
}

interface CampayPaymentRequest {
  amount: string;
  currency: string;
  from: string;
  description: string;
  external_reference: string;
  redirect_url?: string;
}

interface CampayPaymentResponse {
  reference: string;
  status: string;
  operator: string;
  ussd_code?: string;
  operator_reference?: string;
  [key: string]: any;
}

class PaymentService {
  private token: string | null = null;
  private tokenExpires: Date | null = null;

  // Obtenir un token d'authentification Campay
  private async getToken(): Promise<string> {
    try {
      if (this.token && this.tokenExpires && new Date() < this.tokenExpires) {
        return this.token;
      }

      const response = await axios.post<CampayTokenResponse>(
        `${config.campay_base_url}/token/`,
        {
          username: config.campay_username,
          password: config.campay_password,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      this.token = response.data.token;
      this.tokenExpires = new Date(Date.now() + (response.data.expires_in * 1000));
      
      return this.token;
    } catch (error: any) {
      console.error('Erreur lors de l\'obtention du token Campay:', error.response?.data || error.message);
      throw new Error('Impossible d\'obtenir le token de paiement');
    }
  }

  // Initier un paiement
  async initiatePayment(
    userId: string,
    productId: string,
    forfaitId: string,
    phoneNumber: string,
    paymentMethod: PaymentMethod
  ): Promise<{ payment: any; campayResponse?: any }> {
    console.log('💳 Début initiatePayment avec:', {
      userId,
      productId,
      forfaitId,
      phoneNumber: phoneNumber.substring(0, 6) + '***',
      paymentMethod
    });

    let payment: any = null;

    try {
      // Récupérer le forfait
      const forfait = await prisma.forfait.findUnique({
        where: { id: forfaitId },
      });

      if (!forfait) {
        console.error('❌ Forfait non trouvé avec ID:', forfaitId);
        throw new Error('Forfait non trouvé');
      }

      console.log('📦 Forfait récupéré:', {
        id: forfait.id,
        type: forfait.type,
        price: forfait.price,
        currency: 'XAF'
      });

      // 🔴 VALIDATION DU PRIX : Doit être >= 100 XAF pour Campay
      if (forfait.price < 100) {
        console.error('❌ Prix du forfait trop faible:', forfait.price);
        throw new Error(`Le prix minimum pour Campay est 100 XAF (prix actuel: ${forfait.price})`);
      }

      // Créer l'enregistrement de paiement AVANT l'appel Campay
      payment = await prisma.payment.create({
        data: {
          userId,
          productId,
          forfaitId,
          amount: forfait.price,
          currency: 'XAF',
          phoneNumber,
          paymentMethod,
          status: 'PENDING',
        },
      });

      console.log('💾 Payment créé en base:', {
        id: payment.id,
        amount: payment.amount,
        status: payment.status
      });

      // 🔴 VÉRIFICATION DE LA CONFIGURATION
      console.log('🔧 Configuration Campay:', {
        base_url: config.campay_base_url,
        username_length: config.campay_username?.length,
        password_length: config.campay_password?.length,
      });

      // Obtenir le token
      console.log('🔐 Obtention du token...');
      const token = await this.getToken();
      
      if (!token) {
        throw new Error('Token Campay non obtenu');
      }

      console.log('✅ Token obtenu, longueur:', token.length);

      // ✅ VALIDATION UNIFIÉE DU NUMÉRO DE TÉLÉPHONE
      const cleanPhone = phoneNumber.replace(/\s+/g, '');
      if (!PHONE_REGEX.test(cleanPhone)) {
        console.error('❌ Numéro de téléphone invalide:', cleanPhone);
        throw new Error(`Numéro de téléphone invalide: ${cleanPhone}. Format attendu: 237XXXXXXXX ou XXXXXXXX pour le Cameroun`);
      }

      // Formatage pour Campay (toujours avec 237)
      let formattedPhone = cleanPhone;
      if (!formattedPhone.startsWith('237')) {
        formattedPhone = '237' + formattedPhone;
      }

      console.log('📱 Numéros:', {
        original: phoneNumber,
        formatted: formattedPhone
      });

      // Préparer la requête de paiement
      const paymentData: CampayPaymentRequest = {
        amount: forfait.price.toString(), // 🔴 S'assurer que c'est une string
        currency: 'XAF',
        from: formattedPhone,
        description: `Forfait ${forfait.type} - ${productId.substring(0, 8)}`,
        external_reference: payment.id,
      };

      console.log('📤 Données finales à envoyer à Campay:', {
        amount: paymentData.amount,
        currency: paymentData.currency,
        from: paymentData.from,
        description: paymentData.description,
        external_reference: paymentData.external_reference
      });

      console.log('🚀 Envoi de la requête à Campay...');
      console.log('🔗 URL complète:', `${config.campay_base_url}/collect/`);

      // Effectuer la requête de paiement avec gestion d'erreur améliorée
      const campayResponse = await axios.post<CampayPaymentResponse>(
        `${config.campay_base_url}/collect/`,
        paymentData,
        {
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 60000,
          // 🔴 VALIDATION DE LA RÉPONSE
          validateStatus: function (status) {
            return status < 500; // Résoudre seulement les erreurs serveur
          }
        }
      );

      console.log('📨 Réponse Campay complète:', {
        status: campayResponse.status,
        statusText: campayResponse.statusText,
        headers: Object.keys(campayResponse.headers),
        data: campayResponse.data
      });

      // Vérifier le statut de la réponse
      if (campayResponse.status !== 200) {
        console.error('❌ Campay a retourné un statut d\'erreur:', campayResponse.status);
        throw new Error(`Campay error ${campayResponse.status}: ${JSON.stringify(campayResponse.data)}`);
      }

      // Mettre à jour le paiement avec la référence Campay
      const updatedPayment = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          campayReference: campayResponse.data.reference,
          campayOperator: campayResponse.data.operator,
          campayStatus: campayResponse.data.status || 'PENDING',
          campayTransactionId: campayResponse.data.operator_reference,
          metadata: {
            fullCampayResponse: campayResponse.data,
            ussdCode: campayResponse.data.ussd_code,
            timestamp: new Date().toISOString()
          } as any
        },
      });

      console.log('💾 Payment mis à jour avec succès');

      return {
        payment: updatedPayment,
        campayResponse: campayResponse.data,
      };

    } catch (error: any) {
      console.error('❌ Erreur COMPLÈTE dans initiatePayment:', {
        name: error.name,
        message: error.message,
        // Axios error details
        isAxiosError: error.isAxiosError,
        status: error.response?.status,
        statusText: error.response?.statusText,
        responseData: error.response?.data,
        responseHeaders: error.response?.headers ? Object.keys(error.response.headers) : null,
        // Request details
        requestUrl: error.config?.url,
        requestMethod: error.config?.method,
        requestData: error.config?.data,
        requestHeaders: error.config?.headers ? Object.keys(error.config.headers) : null,
        // Context
        paymentId: payment?.id,
        forfaitId,
        phoneNumber: phoneNumber.substring(0, 6) + '***'
      });

      // Marquer le paiement comme échoué
      if (payment?.id) {
        try {
          await prisma.payment.update({
            where: { id: payment.id },
            data: { 
              status: 'FAILED',
              errorMessage: error.message,
              errorDetails: JSON.stringify({
                httpStatus: error.response?.status,
                httpData: error.response?.data,
                timestamp: new Date().toISOString()
              })
            },
          });
        } catch (updateError) {
          console.error('❌ Erreur lors de la mise à jour du payment:', updateError);
        }
      }

      // Rethrow avec tous les détails
      const enrichedError = new Error(error.message);
      (enrichedError as any).response = error.response;
      (enrichedError as any).config = error.config;
      (enrichedError as any).isAxiosError = error.isAxiosError;
      
      throw enrichedError;
    }
  }

  // Vérifier le statut d'un paiement (méthode améliorée)
  async checkPaymentStatus(paymentId: string): Promise<any> {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: { forfait: true, product: true, user: true }
      });

      if (!payment || !payment.campayReference) {
        throw new Error('Paiement introuvable');
      }

      const token = await this.getToken();
      const response = await axios.get(
        `${config.campay_base_url}/transaction/${payment.campayReference}/`,
        {
          headers: {
            'Authorization': `Token ${token}`,
          },
        }
      );

      const campayStatus = response.data.status;
      let newStatus: PaymentStatus = payment.status;

      // Mapper les statuts Campay vers nos statuts
      switch (campayStatus) {
        case 'SUCCESSFUL':
          newStatus = 'SUCCESS';
          break;
        case 'FAILED':
          newStatus = 'FAILED';
          break;
        case 'PENDING':
          newStatus = 'PENDING';
          break;
        default:
          newStatus = 'FAILED';
      }

      // Mettre à jour le statut si nécessaire
      if (newStatus !== payment.status) {
        const updatedPayment = await prisma.payment.update({
          where: { id: paymentId },
          data: {
            status: newStatus,
            paidAt: newStatus === 'SUCCESS' ? new Date() : payment.paidAt,
            failureReason: newStatus === 'FAILED' ? response.data.reason : null,
            campayStatus: campayStatus,
            metadata: {
              ...payment.metadata as any,
              lastStatusCheck: new Date().toISOString(),
              campayResponse: response.data
            },
          },
          include: { forfait: true, product: true, user: true }
        });

        // ✅ AUTOMATISATION : Si le paiement est réussi, activer le forfait IMMÉDIATEMENT
        if (newStatus === 'SUCCESS') {
          console.log('💳 Paiement réussi détecté, activation automatique du forfait...');
          await this.activateForfaitAfterPayment(updatedPayment);
        }

        return updatedPayment;
      }

      return payment;
    } catch (error: any) {
      console.error('Erreur lors de la vérification du paiement:', error);
      throw new Error('Erreur lors de la vérification du paiement');
    }
  }

  // Activer le forfait après paiement réussi (méthode améliorée)
  private async activateForfaitAfterPayment(payment: any): Promise<void> {
    try {
      console.log('🎯 Début activation forfait pour payment:', payment.id);
      
      // Vérifier si le forfait n'est pas déjà activé pour éviter les doublons
      const existingForfait = await prisma.productForfait.findFirst({
        where: {
          productId: payment.productId,
          forfaitId: payment.forfaitId,
          isActive: true,
          expiresAt: { gt: new Date() }
        }
      });

      if (existingForfait) {
        console.log('⚠️ Forfait déjà actif, ignoré');
        return;
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + payment.forfait.duration * 24 * 60 * 60 * 1000);

      // Utiliser une transaction pour garantir la cohérence
      await prisma.$transaction(async (tx) => {
        // 1. Créer le forfait produit
        await tx.productForfait.create({
          data: {
            productId: payment.productId,
            forfaitId: payment.forfaitId,
            activatedAt: now,
            expiresAt,
            isActive: true,
          },
        });

        // 2. Créer une notification pour l'utilisateur
        await tx.notification.create({
          data: {
            userId: payment.userId,
            title: `Forfait ${payment.forfait.type} activé`,
            message: `Votre forfait ${payment.forfait.type} a été activé avec succès sur "${payment.product.name}". Il expire le ${expiresAt.toLocaleDateString('fr-FR')}.`,
            type: 'PAYMENT_SUCCESS',
            data: {
              productId: payment.productId,
              forfaitType: payment.forfait.type,
              expiresAt: expiresAt.toISOString(),
              paymentId: payment.id
            },
            link: `/product/${payment.productId}`,
          },
        });
      });

      console.log('✅ Forfait activé avec succès');

      // Invalider le cache après activation du forfait
      cacheService.invalidateHomepageProducts();

    } catch (error: any) {
      console.error('❌ Erreur lors de l\'activation du forfait:', error);
      throw error;
    }
  }

  // Obtenir l'historique des paiements d'un utilisateur
  async getUserPayments(userId: string, page: number = 1, limit: number = 10): Promise<any> {
    try {
      const offset = (page - 1) * limit;

      const [payments, totalCount] = await Promise.all([
        prisma.payment.findMany({
          where: { userId },
          skip: offset,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            forfait: true,
            product: {
              select: {
                id: true,
                name: true,
                images: true,
              },
            },
          },
        }),
        prisma.payment.count({ where: { userId } })
      ]);

      return {
        payments,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          total: totalCount,
          perPage: limit,
        },
      };
    } catch (error: any) {
      console.error('Erreur lors de la récupération des paiements:', error);
      throw new Error('Erreur lors de la récupération des paiements');
    }
  }
}

export const paymentService = new PaymentService();