import { Request, Response } from "express";
import ResponseApi from "../helper/response.js";
import prisma from "../model/prisma.client.js";

export const addToFavorites = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.user?.id;
    const { productId } = req.body;

    if (!userId || !productId) {
      return ResponseApi.error(res, "userId et productId sont requis", null, 400);
    }

    // Vérifie si le produit existe
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return ResponseApi.notFound(res, "Produit introuvable", 404);
    }

    // Vérifie si déjà en favoris
    const existing = await prisma.favorite.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    if (existing) {
      return ResponseApi.error(res, "Produit déjà dans les favoris", null, 400);
    }

    const favorite = await prisma.favorite.create({
      data: { userId, productId },
    });

    ResponseApi.success(res, "Produit ajouté aux favoris", favorite, 201);
  } catch (error: any) {
    ResponseApi.error(res, "Erreur lors de l'ajout aux favoris", error.message);
  }
};


export const removeFromFavorites = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.user?.id;
    const { productId } = req.body;

    if (!userId || !productId) {
      return ResponseApi.error(res, "userId et productId sont requis", null, 400);
    }

    // Vérifie si le produit est en favoris
    const favorite = await prisma.favorite.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    if (!favorite) {
      return ResponseApi.notFound(res, "Produit non trouvé dans les favoris", 404);
    }

    await prisma.favorite.delete({
      where: { userId_productId: { userId, productId } },
    });

    ResponseApi.success(res, "Produit retiré des favoris", null, 200);
  } catch (error: any) {
    ResponseApi.error(res, "Erreur lors du retrait des favoris", error.message);
  }
};



export const getUserFavorites = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return ResponseApi.error(res, "userId requis", null, 400);
    }

    const favorites = await prisma.favorite.findMany({
      where: { userId },
      include: { product: true }, // Inclut les infos du produit
    });

    ResponseApi.success(res, "Favoris récupérés avec succès", favorites, 200);
  } catch (error: any) {
    ResponseApi.error(res, "Erreur lors de la récupération des favoris", error.message);
  }
};
// ...existing code...