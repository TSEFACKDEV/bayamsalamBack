import { Request, Response } from "express";
import ResponseApi from "../helper/response.js";
import prisma from "../model/prisma.client.js";

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
    const category = await prisma.city.create({
      data: {
        name,
      },
    });

    ResponseApi.success(res, "City create succesfully", category);
  } catch (error) {
    console.log("====================================");
    console.log(error);
    console.log("====================================");
    ResponseApi.error(res, "Failled to create City", error);
  }
};

//obtenir toutes les villes

export const getAllCities = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const cities = await prisma.city.findMany({
      orderBy: { name: "asc" },
    });
    ResponseApi.success(res, "Categories retrieved succesfully", cities);
  } catch (error) {
    console.log("====================================");
    console.log(error);
    console.log("====================================");
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
    console.log("====================================");
    console.log(error);
    console.log("====================================");
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
    ResponseApi.success(res, "city update succesfully", updatedCity);
  } catch (error) {
    console.log("====================================");
    console.log("Failled to update city", error);
    console.log("====================================");
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
    ResponseApi.success(res, "city Delete succesfully", city);
  } catch (error) {
    console.log("====================================");
    console.log(error);
    console.log("====================================");
    ResponseApi.error(res, "Failled to delete city", error);
  }
};
