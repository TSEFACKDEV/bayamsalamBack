import * as yup from "yup";
import {
  sanitizeProductName,
  sanitizeDescription,
  sanitizeXSS,
} from "../utils/sanitization.utils.js";

// 🔐 Validateurs personnalisés avec sanitization intelligente
const sanitizedStringValidator = (fieldName: string, maxLength = 500) =>
  yup
    .string()
    .transform((value) => sanitizeXSS(value))
    .max(maxLength, `${fieldName} ne peut pas dépasser ${maxLength} caractères`);

const sanitizedProductNameValidator = () =>
  yup
    .string()
    .transform((value) => sanitizeProductName(value))
    .min(3, "Le nom doit contenir au moins 3 caractères")
    .max(100, "Le nom ne peut pas dépasser 100 caractères")
    .required("Le nom est requis");

const sanitizedDescriptionValidator = () =>
  yup
    .string()
    .transform((value) => sanitizeDescription(value))
    .min(10, "La description doit contenir au moins 10 caractères")
    .max(1000, "La description ne peut pas dépasser 1000 caractères")
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
    .positive("La quantité doit être positive")
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
    .oneOf(["NEUF", "OCCASION", "CORRECT"], "L'état doit être NEUF, OCCASION ou CORRECT")
    .required("L'état est requis"),
  quartier: yup
    .string()
    .transform((value) => sanitizeXSS(value))
    .max(100, "Le quartier ne peut pas dépasser 100 caractères")
    .nullable()
    .optional(),
  telephone: yup
    .string()
    .transform((value) => sanitizeXSS(value))
    .matches(/^[0-9+\-\s()]{8,20}$/, "Le numéro de téléphone n'est pas valide")
    .required("Le numéro de téléphone est requis"),
  // Nouveaux champs pour le forfait (optionnels)
  forfaitType: yup
    .string()
    .oneOf(["URGENT", "TOP_ANNONCE", "A_LA_UNE", "PREMIUM"], "Type de forfait invalide")
    .nullable()
    .optional(),
  phoneNumber: yup
    .string()
    .transform((value) => sanitizeXSS(value))
    .matches(/^(237)?[26][0-9]{8}$/, "Numéro de téléphone invalide pour le paiement (format: 237XXXXXXXX)")
    .when('forfaitType', {
      is: (forfaitType: string) => forfaitType != null && forfaitType !== '',
      then: (schema) => schema.required("Le numéro de téléphone est requis pour le paiement du forfait"),
      otherwise: (schema) => schema.optional()
    }),
  paymentMethod: yup
    .string()
    .transform((value) => sanitizeXSS(value))
    .oneOf(["MOBILE_MONEY", "ORANGE_MONEY"], "Méthode de paiement non supportée")
    .when('forfaitType', {
      is: (forfaitType: string) => forfaitType != null && forfaitType !== '',
      then: (schema) => schema.required("La méthode de paiement est requise pour le forfait"),
      otherwise: (schema) => schema.optional()
    }),
  images: yup
    .array()
    .of(yup.mixed())
    .min(1, "Au moins une image est requise")
    .max(5, "Maximum 5 images")
    .optional()
});

// 🔐 Validation sécurisée pour la mise à jour d'un produit
export const updateProductSchema = yup.object().shape({
  name: yup
    .string()
    .transform((value) => sanitizeProductName(value))
    .min(3, "Le nom doit contenir au moins 3 caractères")
    .max(100, "Le nom ne peut pas dépasser 100 caractères")
    .optional(),
  price: yup
    .number()
    .typeError("Le prix doit être un nombre")
    .positive("Le prix doit être positif")
    .max(10000000, "Le prix ne peut pas dépasser 10 millions")
    .optional(),
  quantity: yup
    .number()
    .typeError("La quantité doit être un nombre")
    .integer("La quantité doit être un nombre entier")
    .positive("La quantité doit être positive")
    .max(100000, "La quantité ne peut pas dépasser 100 000")
    .optional(),
  description: yup
    .string()
    .transform((value) => sanitizeDescription(value))
    .min(10, "La description doit contenir au moins 10 caractères")
    .max(1000, "La description ne peut pas dépasser 1000 caractères")
    .optional(),
  categoryId: yup
    .string()
    .uuid("L'ID de catégorie doit être un UUID valide")
    .optional(),
  cityId: yup
    .string()
    .uuid("L'ID de ville doit être un UUID valide")
    .optional(),
  etat: yup
    .string()
    .oneOf(["NEUF", "OCCASION", "CORRECT"], "L'état doit être NEUF, OCCASION ou CORRECT")
    .optional(),
  quartier: yup
    .string()
    .transform((value) => sanitizeXSS(value))
    .max(100, "Le quartier ne peut pas dépasser 100 caractères")
    .nullable()
    .optional(),
  telephone: yup
    .string()
    .transform((value) => sanitizeXSS(value))
    .matches(/^[0-9+\-\s()]{8,20}$/, "Le numéro de téléphone n'est pas valide")
    .optional(),
  // Champs forfait pour la mise à jour
  forfaitType: yup
    .string()
    .oneOf(["URGENT", "TOP_ANNONCE", "A_LA_UNE", "PREMIUM"], "Type de forfait invalide")
    .nullable()
    .optional(),
  phoneNumber: yup
    .string()
    .transform((value) => sanitizeXSS(value))
    .matches(/^(237)?[26][0-9]{8}$/, "Numéro de téléphone invalide pour le paiement (format: 237XXXXXXXX)")
    .when('forfaitType', {
      is: (forfaitType: string) => forfaitType != null && forfaitType !== '',
      then: (schema) => schema.required("Le numéro de téléphone est requis pour le paiement du forfait"),
      otherwise: (schema) => schema.optional()
    }),
  paymentMethod: yup
    .string()
    .transform((value) => sanitizeXSS(value))
    .oneOf(["MOBILE_MONEY", "ORANGE_MONEY"], "Méthode de paiement non supportée")
    .when('forfaitType', {
      is: (forfaitType: string) => forfaitType != null && forfaitType !== '',
      then: (schema) => schema.required("La méthode de paiement est requise pour le forfait"),
      otherwise: (schema) => schema.optional()
    }),
  images: yup
    .array()
    .of(yup.mixed())
    .min(1, "Au moins une image est requise")
    .max(5, "Maximum 5 images")
    .optional()
});

// Validation pour la revue d'un produit (validation/rejet)
export const reviewProductSchema = yup.object().shape({
  action: yup
    .string()
    .transform((value) => sanitizeXSS(value))
    .oneOf(["validate", "reject"], "L'action doit être 'validate' ou 'reject'")
    .required("L'action est requise")
});