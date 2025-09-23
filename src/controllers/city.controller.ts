import { Request, Response } from "express";
import ResponseApi from "../helper/response.js";
import prisma from "../model/prisma.client.js";
import { Prisma } from "@prisma/client";
import { cacheService } from "../services/cache.service.js";

//creation de la ville
export const createCity = async (req: Request, res: Response): Promise<any> => {
  try {
    const { name } = req.body;
    //verifions si la ville existe deja
    const existingCity = await prisma.city.findFirst({
      where: { name: { equals: name } },
    });

    if (existingCity) {
      return ResponseApi.error(res, "City Already exist", null, 409);
    }

    //creer la ville
    const city = await prisma.city.create({
      data: {
        name,
      },
    });

    // Enrichir les données pour maintenir la cohérence
    const enrichedCity = {
      id: city.id,
      name: city.name,
      userCount: 0, // Nouvelle ville = 0 utilisateurs
      productCount: 0, // Nouvelle ville = 0 produits
      createdAt: city.createdAt.toISOString(),
      updatedAt: city.updatedAt.toISOString(),
    };

    // Invalider le cache des villes après création
    cacheService.invalidateCities();

    ResponseApi.success(res, "City create succesfully", enrichedCity);
  } catch (error) {
    console.log(error);
    ResponseApi.error(res, "Failled to create City", error);
  }
};

//obtenir toutes les villes

export const getAllCities = async (
  req: Request,
  res: Response
): Promise<any> => {
  const search = (req.query.search as string) || "";

  try {
    // 🔧 VALIDATION: Vérifier que le terme de recherche n'est pas trop court
    if (search && search.trim().length < 1) {
      return ResponseApi.error(res, "Terme de recherche trop court", null, 400);
    }

    // 🆕 SUPPORT RECHERCHE : Si recherche, ne pas utiliser le cache pour avoir des résultats à jour
    if (!search) {
      // Vérifier d'abord si les données sont en cache (uniquement pour requêtes sans recherche)
      const cachedCities = cacheService.getCities();
      if (cachedCities) {
        return ResponseApi.success(
          res,
          "Cities retrieved successfully (cache)",
          cachedCities
        );
      }
    }

    // Construction des filtres de recherche
    const whereClause: any = {};

    // Filtre de recherche par nom
    if (search && search.trim()) {
      const searchTerm = search.trim();
      whereClause.name = {
        contains: searchTerm,
      };
    }
    const cities = await prisma.city.findMany({
      orderBy: { name: "asc" },
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined, // 🆕 UTILISE LES FILTRES
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    // Enrichir les données avec les comptes d'utilisateurs et formater la réponse
    const enrichedCities = await Promise.all(
      cities.map(async (city) => {
        // Compter les utilisateurs uniques ayant des produits dans cette ville
        const userCount = await prisma.user.count({
          where: {
            products: {
              some: {
                cityId: city.id,
              },
            },
          },
        });

        return {
          id: city.id,
          name: city.name,
          userCount,
          productCount: city._count.products,
          createdAt: city.createdAt.toISOString(),
          updatedAt: city.updatedAt.toISOString(),
        };
      })
    );

    // 🆕 Mettre en cache seulement les requêtes sans recherche pour éviter la pollution du cache
    if (!search) {
      // Mettre en cache les données enrichies
      cacheService.setCities(enrichedCities);
    }

    ResponseApi.success(res, "Cities retrieved successfully", enrichedCities);
  } catch (error) {
    console.error("❌ Erreur dans getAllCities:", error);

    // 🔧 Gestion d'erreur améliorée avec plus de détails
    if (error instanceof Error) {
      if (error.message.includes("Prisma")) {
        ResponseApi.error(
          res,
          "Erreur de base de données lors de la récupération des villes",
          error.message,
          500
        );
      } else {
        ResponseApi.error(
          res,
          "Erreur lors de la récupération des villes",
          error.message,
          500
        );
      }
    } else {
      ResponseApi.error(
        res,
        "Erreur inconnue lors de la récupération des villes",
        "Une erreur inattendue s'est produite",
        500
      );
    }
  }
};

//obtenir une ville en fonction de son id
export const getCityById = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    //verification de l'id
    if (!id) {
      return ResponseApi.notFound(res, "Id is not Found");
    }

    //recuperation de la ville
    const city = await prisma.city.findUnique({
      where: { id },
      include: {
        products: {
          take: 5,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            price: true,
            city: true,
            images: true,
            createdAt: true,
          },
        },
      },
    });
    if (!city) {
      return ResponseApi.notFound(res, "city not Found");
    }

    ResponseApi.success(res, "City retrieved succesfully", city);
  } catch (error) {
    console.log(error);
    ResponseApi.error(res, "Failled to get city", error);
  }
};

//mise a jour de la ville
export const updateCity = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    //verification de l'id
    if (!id) {
      return ResponseApi.notFound(res, "Id is not Found");
    }

    //verifions si la ville existe par ID
    const existingCity = await prisma.city.findUnique({
      where: { id },
    });

    if (!existingCity) {
      return ResponseApi.notFound(res, "City not Found");
    }

    // Vérifier si le nouveau nom est déjà utilisé par une autre ville
    if (name && name.toLowerCase() !== existingCity.name.toLowerCase()) {
      const nameExists = await prisma.city.findFirst({
        where: { name: { equals: name }, NOT: { id } },
      });
      if (nameExists) {
        return ResponseApi.error(res, "city name already in use", null);
      }
    }

    const updatedCity = await prisma.city.update({
      where: { id },
      data: {
        name,
      },
    });

    // Enrichir les données comme dans getAllCities pour maintenir la cohérence
    const userCount = await prisma.user.count({
      where: {
        products: {
          some: {
            cityId: updatedCity.id,
          },
        },
      },
    });

    const productCount = await prisma.product.count({
      where: {
        cityId: updatedCity.id,
      },
    });

    const enrichedCity = {
      id: updatedCity.id,
      name: updatedCity.name,
      userCount,
      productCount,
      createdAt: updatedCity.createdAt.toISOString(),
      updatedAt: updatedCity.updatedAt.toISOString(),
    };

    // Invalider le cache des villes après mise à jour
    cacheService.invalidateCities();

    ResponseApi.success(res, "city update succesfully", enrichedCity);
  } catch (error) {
    console.log("Failled to update city", error);
    ResponseApi.error(res, "Failled to update city", error);
  }
};

//suprimer une ville
export const deleteCity = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    //verifions si la ville existe
    const existingCity = await prisma.city.findFirst({
      where: { id },
    });

    if (!existingCity) {
      return ResponseApi.notFound(res, "City not Found");
    }
    // Vérifier si la ville contient des produits
    const productsCount = await prisma.product.count({
      where: { cityId: id },
    });

    if (productsCount > 0) {
      return ResponseApi.error(
        res,
        "Impossible to delete city that contains products",
        `This city has ${productsCount} product(s)`,
        409
      );
    }
    // Supprimer la ville
    const city = await prisma.city.delete({ where: { id } });

    // Invalider le cache des villes après suppression
    cacheService.invalidateCities();

    ResponseApi.success(res, "city Delete succesfully", city);
  } catch (error) {
    console.log(error);
    ResponseApi.error(res, "Failled to delete city", error);
  }
};
