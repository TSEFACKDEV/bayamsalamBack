import { Request, Response } from "express";
import prisma from "../model/prisma.client.js";
import ResponseApi from "../helper/response.js";
import { createNotification } from "../services/notification.service.js";

// Activation d'un forfait sur un produit par l'administrateur
export const activateForfait = async (req: Request, res: Response): Promise<any> => {
  const { productId, forfaitType } = req.body;
  try {
    // Vérifier si le forfait existe
    const forfait = await prisma.forfait.findFirst({ where: { type: forfaitType } });
    if (!forfait) return ResponseApi.notFound(res, "Forfait non trouvé", 404);

    // Vérifier si le produit existe
    const product = await prisma.product.findUnique({ 
      where: { id: productId },
      include: { user: true }
    });
    if (!product) return ResponseApi.notFound(res, "Produit non trouvé", 404);

    // Vérifier si le produit a déjà ce forfait actif
    const existingForfait = await prisma.productForfait.findFirst({
      where: {
        productId,
        forfait: { type: forfaitType },
        isActive: true,
        expiresAt: { gt: new Date() }
      }
    });

    if (existingForfait) {
      return ResponseApi.error(res, "Ce forfait est déjà actif sur ce produit", null, 400);
    }

    // Calculer la date d'expiration
    const now = new Date();
    const expiresAt = new Date(now.getTime() + forfait.duration * 24 * 60 * 60 * 1000);

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

    ResponseApi.success(res, `Forfait ${forfaitType} activé sur le produit avec succès`, null);
  } catch (error: any) {
    console.error("Erreur lors de l'activation du forfait:", error);
    ResponseApi.error(res, "Erreur lors de l'activation du forfait", error.message);
  }
};

