import { Request, Response } from "express";
import ResponseApi from "../helper/response.js";
import prisma from "../model/prisma.client.js";
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
      return ResponseApi.notFound(res, "City Already exist");
    }

    //creer la ville
    const city = await prisma.city.create({
      data: {
        name,
      },
    });

    // Enrichir les données comme dans getAllCities pour maintenir la cohérence
    const enrichedCity = {
      id: city.id,
      name: city.name,
      region: null,
      country: "Cameroun",
      latitude: null,
      longitude: null,
      userCount: 0, // Nouvelle ville = 0 utilisateurs
      productCount: 0, // Nouvelle ville = 0 produits
      isActive: true,
      createdAt: city.createdAt.toISOString(),
      updatedAt: city.updatedAt.toISOString(),
    };

    // 🚀 CACHE: Invalider le cache des villes après création
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
  try {
    // 🚀 CACHE: Vérifier d'abord si les données sont en cache
    const cachedCities = cacheService.getCities();
    if (cachedCities) {
      return ResponseApi.success(
        res,
        "Cities retrieved successfully (cache)",
        cachedCities
      );
    }

    const cities = await prisma.city.findMany({
      orderBy: { name: "asc" },
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
          region: null, // Pas encore défini dans le schéma
          country: "Cameroun", // Valeur par défaut
          latitude: null,
          longitude: null,
          userCount,
          productCount: city._count.products,
          isActive: true, // Valeur par défaut
          createdAt: city.createdAt.toISOString(),
          updatedAt: city.updatedAt.toISOString(),
        };
      })
    );

    // 🚀 CACHE: Mettre en cache les données enrichies
    cacheService.setCities(enrichedCities);

    ResponseApi.success(res, "Cities retrieved successfully", enrichedCities);
  } catch (error) {
    console.log(error);
    ResponseApi.error(res, "Failled to fect all cities", error);
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
      region: null,
      country: "Cameroun",
      latitude: null,
      longitude: null,
      userCount,
      productCount,
      isActive: true,
      createdAt: updatedCity.createdAt.toISOString(),
      updatedAt: updatedCity.updatedAt.toISOString(),
    };

    // 🚀 CACHE: Invalider le cache des villes après mise à jour
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
      return ResponseApi.notFound(
        res,
        "impossible to Delete ville  who have a product"
      );
    }
    // Supprimer la ville
    const city = await prisma.city.delete({ where: { id } });

    // 🚀 CACHE: Invalider le cache des villes après suppression
    cacheService.invalidateCities();

    ResponseApi.success(res, "city Delete succesfully", city);
  } catch (error) {
    console.log(error);
    ResponseApi.error(res, "Failled to delete city", error);
  }
};
