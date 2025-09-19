import { Request, Response } from "express";
import prisma from "../model/prisma.client.js";
import ResponseApi from "../helper/response.js";
import { createNotification } from "../services/notification.service.js";
import { initiateFuturaPayment } from "../services/futurapay.service.js";
import config from "../config/config.js";

/**
 * Activation d'un forfait sur un produit par l'administrateur
 */
export const activateForfait = async (
  req: Request,
  res: Response
): Promise<any> => {
  const { productId, forfaitType } = req.body;
  try {
    // Vérifier si le forfait existe
    const forfait = await prisma.forfait.findFirst({
      where: { type: forfaitType },
    });
    if (!forfait) return ResponseApi.notFound(res, "Forfait non trouvé", 404);

    // Vérifier si le produit existe
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { user: true },
    });
    if (!product) return ResponseApi.notFound(res, "Produit non trouvé", 404);

    // Vérifier si le produit a déjà ce forfait actif
    const existingForfait = await prisma.productForfait.findFirst({
      where: {
        productId,
        forfait: { type: forfaitType },
        isActive: true,
        expiresAt: { gt: new Date() },
      },
    });

    if (existingForfait) {
      return ResponseApi.error(
        res,
        "Ce forfait est déjà actif sur ce produit",
        null,
        400
      );
    }

    // Calculer la date d'expiration
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + forfait.duration * 24 * 60 * 60 * 1000
    );

    // Créer le forfait pour le produit
    await prisma.productForfait.create({
      data: {
        productId,
        forfaitId: forfait.id,
        activatedAt: now,
        expiresAt,
        isActive: true,
      },
    });

    // Créer une notification pour l'utilisateur
    if (product.user?.id) {
      await createNotification(
        product.user.id,
        `Forfait ${forfaitType} activé`,
        `Un forfait ${forfaitType} a été activé sur votre annonce "${product.name}".`,
        {
          type: "PRODUCT_FORFAIT",
          link: `/annonce/${productId}`,
        }
      );
    }

    ResponseApi.success(
      res,
      `Forfait ${forfaitType} activé sur le produit avec succès`,
      null
    );
  } catch (error: any) {
    console.error("Erreur lors de l'activation du forfait:", error);
    ResponseApi.error(
      res,
      "Erreur lors de l'activation du forfait",
      error.message
    );
  }
};

/**
 * Désactivation d'un forfait sur un produit par l'administrateur
 */
export const deactivateForfait = async (
  req: Request,
  res: Response
): Promise<any> => {
  const { productId, forfaitType } = req.body;
  try {
    // Vérifier si le produit existe
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { user: true },
    });
    if (!product) return ResponseApi.notFound(res, "Produit non trouvé", 404);

    // Trouver le forfait actif à désactiver
    const activeForfait = await prisma.productForfait.findFirst({
      where: {
        productId,
        forfait: { type: forfaitType },
        isActive: true,
      },
      include: { forfait: true },
    });

    if (!activeForfait) {
      return ResponseApi.error(
        res,
        "Aucun forfait actif de ce type trouvé sur ce produit",
        null,
        404
      );
    }

    // Désactiver le forfait
    await prisma.productForfait.update({
      where: { id: activeForfait.id },
      data: {
        isActive: false,
        deactivatedAt: new Date(),
      },
    });

    // Créer une notification pour l'utilisateur
    if (product.user?.id) {
      await createNotification(
        product.user.id,
        `Forfait ${forfaitType} retiré`,
        `Le forfait ${forfaitType} a été retiré de votre annonce "${product.name}".`,
        {
          type: "PRODUCT_FORFAIT",
          link: `/annonce/${productId}`,
        }
      );
    }

    ResponseApi.success(
      res,
      `Forfait ${forfaitType} retiré du produit avec succès`,
      null
    );
  } catch (error: any) {
    console.error("Erreur lors de la désactivation du forfait:", error);
    ResponseApi.error(
      res,
      "Erreur lors de la désactivation du forfait",
      error.message
    );
  }
};

//desacttivation de forfait

// Nouvel endpoint : initier le paiement pour un forfait (frontend affiche iframe avec l'URL)
export const initiateForfaitPayment = async (
  req: Request,
  res: Response
): Promise<any> => {
  const { productId, forfaitType } = req.body;
  try {
    const forfait = await prisma.forfait.findFirst({
      where: { type: forfaitType },
    });
    if (!forfait) return ResponseApi.notFound(res, "Forfait non trouvé", 404);

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { user: true },
    });
    if (!product) return ResponseApi.notFound(res, "Produit non trouvé", 404);

    // Créer réservation temporaire du forfait (isActive=false) — on active seulement après paiement
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + forfait.duration * 24 * 60 * 60 * 1000
    );

    const productForfait = await prisma.productForfait.create({
      data: {
        productId,
        forfaitId: forfait.id,
        activatedAt: now,
        expiresAt,
        isActive: false, // en attente de paiement
      },
    });

    // Préparer les données de transaction — on passe productForfait.id comme customer_transaction_id
    const transactionData = {
      currency: "XAF",
      amount: forfait.price,
      customer_transaction_id: productForfait.id, // identifiant de la réservation
      country_code: "CM",
      customer_first_name: product.user?.firstName || "Client",
      customer_last_name: product.user?.lastName || "",
      customer_phone: product.telephone || "",
      customer_email: product.user?.email || "",
      // vous pouvez ajouter d'autres champs si le SDK le supporte
    };

    const securedUrl = initiateFuturaPayment(transactionData);

    // Retourner l'URL sécurisé au frontend (iframe) ainsi que l'id de la réservation
    return ResponseApi.success(res, "Payment initiated", {
      url: securedUrl,
      productForfaitId: productForfait.id,
    });
  } catch (error: any) {
    console.error("Erreur initiation paiement forfait:", error);
    return ResponseApi.error(res, "Erreur initiation paiement", error.message);
  }
};

// Endpoint de confirmation (webhook ou appel frontend après paiement)
// Attendre que FuturaPay envoie un webhook ou que frontend appelle cet endpoint avec le customer_transaction_id et status
export const confirmForfaitPayment = async (
  req: Request,
  res: Response
): Promise<any> => {
  const { customer_transaction_id, status } = req.body;
  try {
    if (!customer_transaction_id)
      return ResponseApi.error(res, "Transaction id requis", null, 400);

    const productForfait = await prisma.productForfait.findUnique({
      where: { id: customer_transaction_id },
      include: { product: true, forfait: true },
    });
    if (!productForfait)
      return ResponseApi.notFound(
        res,
        "Réservation de forfait introuvable",
        404
      );

    // Vérifier l'état retourné par FuturaPay (adapter selon votre webhook)
    if (status === "SUCCESS" || status === "PAID") {
      // Activer le forfait
      await prisma.productForfait.update({
        where: { id: productForfait.id },
        data: { isActive: true, activatedAt: new Date() },
      });

      // Notification utilisateur
      if (productForfait.product?.userId) {
        await createNotification(
          productForfait.product.userId,
          `Forfait ${productForfait.forfait.type} activé`,
          `Votre forfait pour l'annonce "${productForfait.product.name}" a été activé après paiement.`,
          {
            type: "PRODUCT_FORFAIT",
            link: `/annonce/${productForfait.productId}`,
          }
        );
      }

      return ResponseApi.success(res, "Paiement confirmé et forfait activé", {
        productForfaitId: productForfait.id,
      });
    }

    // Paiement non réussi
    // Optionnel : supprimer la réservation si échec
    await prisma.productForfait.delete({ where: { id: productForfait.id } });
    return ResponseApi.error(res, "Paiement échoué ou annulé", null, 400);
  } catch (error: any) {
    console.error("Erreur confirmation paiement forfait:", error);
    return ResponseApi.error(
      res,
      "Erreur confirmation paiement",
      error.message
    );
  }
};
