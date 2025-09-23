import * as yup from "yup";
import {
  sanitizeProductName,
  sanitizeDescription,
  sanitizeXSS,
} from "../utils/sanitization.utils.js";

// 🔐 Validateurs personnalisés avec sanitization intelligente
const sanitizedStringValidator = (fieldName: string, maxLength: number = 500) =>
  yup
    .string()
    .transform((value) => sanitizeXSS(value))
    .max(maxLength, `${fieldName} ne peut pas dépasser ${maxLength} caractères`)
    .required(`${fieldName} est requis`);

const sanitizedProductNameValidator = () =>
  yup
    .string()
    .transform((value) => sanitizeProductName(value))
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(100, "Le nom ne peut pas dépasser 100 caractères")
    .required("Le nom est requis");

const sanitizedDescriptionValidator = () =>
  yup
    .string()
    .transform((value) => sanitizeDescription(value))
    .min(10, "La description doit contenir au moins 10 caractères")
    .max(2000, "La description ne peut pas dépasser 2000 caractères")
    .required("La description est requise");

// 🔐 Validation sécurisée pour la création d'un produit
export const createProductSchema = yup.object().shape({
  name: sanitizedProductNameValidator(),
  price: yup
    .number()
    .typeError("Le prix doit être un nombre")
    .positive("Le prix doit être positif")
    .max(10000000, "Le prix ne peut pas dépasser 10 millions")
    .required("Le prix est requis"),
  quantity: yup
    .number()
    .typeError("La quantité doit être un nombre")
    .integer("La quantité doit être un nombre entier")
    .min(0, "La quantité ne peut pas être négative")
    .max(100000, "La quantité ne peut pas dépasser 100 000")
    .required("La quantité est requise"),
  description: sanitizedDescriptionValidator(),
  categoryId: yup
    .string()
    .uuid("L'ID de catégorie doit être un UUID valide")
    .required("La catégorie est requise"),
  cityId: yup
    .string()
    .uuid("L'ID de ville doit être un UUID valide")
    .required("La ville est requise"),
  etat: yup
    .string()
    .oneOf(["NEUF", "OCCASION", "CORRECT"], "État invalide")
    .required("L'état est requis"),
  quartier: sanitizedStringValidator("Le quartier", 100).nullable(),
  telephone: yup
    .string()
    .matches(/^[+]?[\d\s\-()]{8,20}$/, "Numéro de téléphone invalide")
    .required("Le téléphone est requis"),
  forfaitType: yup
    .string()
    .oneOf(
      ["PREMIUM", "A_LA_UNE", "TOP_ANNONCE", "URGENT"],
      "Type de forfait invalide"
    )
    .nullable(),
  images: yup
    .array()
    .of(yup.mixed())
    .min(1, "Au moins une image est requise")
    .max(5, "Maximum 5 images"),
});

// Validation pour la revue d'un produit (validation/rejet)
export const reviewProductSchema = yup.object().shape({
  action: yup
    .string()
    .oneOf(["validate", "reject"], "Action invalide")
    .required("L'action est requise"),
});
