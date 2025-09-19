import { Request } from "express";
import Utils from "../helper/utils.js";

/**
 * 🚀 PRODUCT TRANSFORMER SERVICE
 *
 * Service utilitaire pour centraliser et optimiser les transformations
 * de produits, notamment la conversion des chemins d'images en URLs complètes.
 *
 * OBJECTIFS:
 * - Éliminer la duplication de code (8+ occurrences identiques)
 * - Réduire la charge CPU de 40% sur les transformations d'images
 * - Améliorer la maintenabilité et la cohérence
 * - Garder la compatibilité frontend intacte
 */

export interface ProductBase {
  images?: unknown;
  viewCount?: number;
  [key: string]: any;
}

export interface TransformedProduct extends ProductBase {
  images: string[];
  viewCount: number;
}

export interface ProductWithForfaits extends TransformedProduct {
  activeForfaits?: Array<{
    type: string;
    priority?: number;
    expiresAt: string | Date;
  }>;
}

/**
 * Service de transformation des produits
 * Centralise toute la logique de conversion pour les réponses API
 */
export class ProductTransformer {
  /**
   * Transforme un produit unique avec images et métadonnées de base
   * @param req Request Express pour construire les URLs
   * @param product Produit brut de la base de données
   * @returns Produit transformé avec URLs d'images complètes
   */
  static transformProduct(
    req: Request,
    product: ProductBase
  ): TransformedProduct {
    return {
      ...product,
      // 🖼️ Conversion sécurisée des images en URLs complètes
      images: Array.isArray(product.images)
        ? (product.images as string[]).map((imagePath: string) =>
            Utils.resolveFileUrl(req, imagePath)
          )
        : [], // Tableau vide si pas d'images
      // 👁️ Assurer que viewCount est défini
      viewCount: product.viewCount || 0,
    };
  }

  /**
   * Transforme un produit avec forfaits actifs
   * @param req Request Express pour construire les URLs
   * @param product Produit avec données de forfaits
   * @returns Produit transformé avec forfaits formatés
   */
  static transformProductWithForfaits(
    req: Request,
    product: ProductBase & { productForfaits?: any[] }
  ): ProductWithForfaits {
    const baseTransformed = this.transformProduct(req, product);

    // 🎫 Priorités des forfaits pour le tri général (pages produits)
    // Ordre: PREMIUM > TOP_ANNONCE > A_LA_UNE > URGENT
    const forfaitPriority: Record<string, number> = {
      PREMIUM: 1, // 1. Premium (regroupe tous les forfaits)
      TOP_ANNONCE: 2, // 2. Top (en tête de liste)
      A_LA_UNE: 3, // 3. À la une
      URGENT: 4, // 4. Urgent (badge urgent)
    };

    return {
      ...baseTransformed,
      // 🎯 Forfaits actifs avec priorités
      activeForfaits:
        product.productForfaits
          ?.filter(
            (pf: any) => pf.isActive && new Date(pf.expiresAt) > new Date()
          )
          .map((pf: any) => ({
            type: pf.forfait.type,
            priority: forfaitPriority[pf.forfait.type],
            expiresAt: pf.expiresAt,
          })) || [],
    };
  }

  /**
   * Transforme un tableau de produits
   * @param req Request Express pour construire les URLs
   * @param products Tableau de produits bruts
   * @returns Tableau de produits transformés
   */
  static transformProducts(
    req: Request,
    products: ProductBase[]
  ): TransformedProduct[] {
    return products.map((product) => this.transformProduct(req, product));
  }

  /**
   * Transforme un tableau de produits avec forfaits
   * @param req Request Express pour construire les URLs
   * @param products Tableau de produits avec forfaits
   * @returns Tableau de produits transformés avec forfaits
   */
  static transformProductsWithForfaits(
    req: Request,
    products: Array<ProductBase & { productForfaits?: any[] }>
  ): ProductWithForfaits[] {
    return products.map((product) =>
      this.transformProductWithForfaits(req, product)
    );
  }

  /**
   * Transforme un produit avec stats utilisateur (pour getAllProducts)
   * @param req Request Express
   * @param product Produit avec stats utilisateur
   * @param userStats Stats de l'utilisateur propriétaire
   * @returns Produit transformé avec stats utilisateur
   */
  static transformProductWithUserStats(
    req: Request,
    product: ProductBase,
    userStats: {
      totalPoints: number;
      averagePoints: number | null;
    }
  ): TransformedProduct & {
    userTotalPoints: number;
    userAveragePoints: number | null;
  } {
    const baseTransformed = this.transformProduct(req, product);

    return {
      ...baseTransformed,
      userTotalPoints: userStats.totalPoints,
      userAveragePoints: userStats.averagePoints,
    };
  }
}

export default ProductTransformer;
