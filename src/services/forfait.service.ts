import prisma from "../model/prisma.client.js";
import { ForfaitType, PaymentMethod } from "@prisma/client";
import { paymentService } from './payment.service.js';

// ✅ REGEX UNIFIÉE pour les numéros de téléphone camerounais
export const PHONE_REGEX = /^(237)?[26][0-9]{8}$/;

interface ForfaitPaymentData {
  productId: string;
  userId: string;
  forfaitType: string;
  phoneNumber: string;
  paymentMethod: string;
}

interface ForfaitPaymentResult {
  success: boolean;
  payment?: {
    paymentId: string;
    amount: number;
    campayReference?: string;
    ussdCode?: string;
    status: string;
    instructions: string;
    forfait: {
      id: string;
      type: string;
      price: number;
      duration: number;
    };
  };
  error?: {
    error: boolean;
    message: string;
  };
}

class ForfaitService {
  // ✅ MÉTHODE UNIFIÉE - Récupérer un forfait par son type
  static async getForfaitByType(forfaitType: string) {
    // Valider que le forfaitType est valide
    if (!Object.values(ForfaitType).includes(forfaitType as ForfaitType)) {
      throw new Error(`Type de forfait invalide: ${forfaitType}. Types acceptés: ${Object.values(ForfaitType).join(', ')}`);
    }

    const forfait = await prisma.forfait.findFirst({
      where: { type: forfaitType as ForfaitType }
    });
    
    if (!forfait) {
      throw new Error(`Forfait de type ${forfaitType} non trouvé`);
    }
    
    return forfait;
  }

  // ✅ MÉTHODE UNIFIÉE - Valider les données de paiement
  static validatePaymentData(phoneNumber: string, paymentMethod: string): { isValid: boolean; error?: string; cleanPhone?: string } {
    // Validation du numéro de téléphone
    const cleanPhone = phoneNumber.replace(/\s+/g, '');
    if (!PHONE_REGEX.test(cleanPhone)) {
      return {
        isValid: false,
        error: 'Numéro de téléphone invalide (format: 237XXXXXXXX ou XXXXXXXX pour le Cameroun)'
      };
    }

    // Validation de la méthode de paiement
    if (!['MOBILE_MONEY', 'ORANGE_MONEY'].includes(paymentMethod)) {
      return {
        isValid: false,
        error: 'Méthode de paiement non supportée. Utilisez MOBILE_MONEY ou ORANGE_MONEY'
      };
    }

    return { isValid: true, cleanPhone };
  }

  // ✅ MÉTHODE UNIFIÉE - Traiter un paiement de forfait (CREATE/UPDATE)
  static async handleForfaitPayment(data: ForfaitPaymentData): Promise<ForfaitPaymentResult> {
    try {
      const { productId, userId, forfaitType, phoneNumber, paymentMethod } = data;

      // Validation des données
      const validation = this.validatePaymentData(phoneNumber, paymentMethod);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            error: true,
            message: validation.error!
          }
        };
      }

      // Récupérer le forfait
      const forfait = await this.getForfaitByType(forfaitType);

      // Vérifier si le forfait n'est pas déjà actif
      const isAlreadyActive = await this.isForfaitActive(productId, forfait.id);
      if (isAlreadyActive) {
        return {
          success: false,
          error: {
            error: true,
            message: `Le forfait ${forfaitType} est déjà actif sur ce produit`
          }
        };
      }

      // Initier le paiement
      const paymentResult = await paymentService.initiatePayment(
        userId,
        productId,
        forfait.id,
        validation.cleanPhone!,
        paymentMethod as PaymentMethod
      );

      return {
        success: true,
        payment: {
          paymentId: paymentResult.payment.id,
          amount: paymentResult.payment.amount,
          campayReference: paymentResult.payment.campayReference,
          ussdCode: paymentResult.campayResponse?.ussd_code,
          status: 'PENDING',
          instructions: 'Composez le code USSD pour finaliser le paiement. Le forfait sera activé automatiquement après paiement.',
          forfait: {
            id: forfait.id,
            type: forfait.type,
            price: forfait.price,
            duration: forfait.duration
          }
        }
      };

    } catch (error: any) {
      console.error('❌ Erreur lors du traitement du forfait:', error);
      return {
        success: false,
        error: {
          error: true,
          message: error.message || 'Erreur lors de l\'initiation du paiement'
        }
      };
    }
  }

  // Vérifier si un forfait est déjà actif
  static async isForfaitActive(productId: string, forfaitId: string): Promise<boolean> {
    const existingForfait = await prisma.productForfait.findFirst({
      where: {
        productId,
        forfaitId,
        isActive: true,
        expiresAt: { gt: new Date() }
      }
    });
    
    return !!existingForfait;
  }

  // Calculer la date d'expiration
  static calculateExpirationDate(duration: number): Date {
    const now = new Date();
    return new Date(now.getTime() + duration * 24 * 60 * 60 * 1000);
  }

  // ✅ BONUS : Méthode pour valider les types de forfait
  static isValidForfaitType(type: string): type is ForfaitType {
    return Object.values(ForfaitType).includes(type as ForfaitType);
  }

  // ✅ BONUS : Récupérer tous les types valides
  static getValidForfaitTypes(): ForfaitType[] {
    return Object.values(ForfaitType);
  }
}

export default ForfaitService;