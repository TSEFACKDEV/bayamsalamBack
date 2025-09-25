import { Request, Response } from "express";
import prisma from "../model/prisma.client.js";
import ResponseApi from "../helper/response.js";
import { createNotification } from "../services/notification.service.js";

import config from "../config/config.js";
import { cacheService } from "../services/cache.service.js";

/**
 * Récupérer tous les forfaits disponibles
 */
export const getAllForfaits = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const forfaits = await prisma.forfait.findMany({
      orderBy: { price: 'asc' },
      select: {
        id: true,
        type: true,
        price: true,
        duration: true,
        description: true,
      }
    });

    ResponseApi.success(res, "Forfaits récupérés avec succès", forfaits);
  } catch (error: any) {
    console.error("Erreur lors de la récupération des forfaits:", error);
    ResponseApi.error(
      res,
      "Erreur lors de la récupération des forfaits",
      error.message
    );
  }
};

/**
 * Récupérer les forfaits actifs d'un produit
 */
export const getProductForfaits = async (
  req: Request,
  res: Response
): Promise<any> => {
  const { productId } = req.params;
  
  try {
    const productForfaits = await prisma.productForfait.findMany({
      where: {
        productId,
        isActive: true,
        expiresAt: { gt: new Date() }
      },
      include: {
        forfait: {
          select: {
            id: true,
            type: true,
            price: true,
            duration: true,
            description: true,
          }
        }
      },
      orderBy: { activatedAt: 'desc' }
    });

    ResponseApi.success(res, "Forfaits du produit récupérés avec succès", {
      productId,
      forfaits: productForfaits.map(pf => ({
        id: pf.id,
        forfait: pf.forfait,
        activatedAt: pf.activatedAt,
        expiresAt: pf.expiresAt,
        isActive: pf.isActive
      }))
    });
  } catch (error: any) {
    console.error("Erreur lors de la récupération des forfaits du produit:", error);
    ResponseApi.error(
      res,
      "Erreur lors de la récupération des forfaits du produit",
      error.message
    );
  }
};

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

    // Invalider le cache après activation forfait
    cacheService.invalidateHomepageProducts();

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

    // Invalider le cache après désactivation forfait
    cacheService.invalidateHomepageProducts();

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


