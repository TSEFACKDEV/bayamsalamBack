"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewProductSchema = exports.createProductSchema = void 0;
const yup = __importStar(require("yup"));
const securityUtils_js_1 = require("../utils/securityUtils.js");
// 🔐 Validateurs personnalisés avec sanitization intelligente
const sanitizedStringValidator = (fieldName, maxLength = 500) => yup
    .string()
    .transform((value) => (0, securityUtils_js_1.sanitizeXSS)(value))
    .max(maxLength, `${fieldName} ne peut pas dépasser ${maxLength} caractères`)
    .required(`${fieldName} est requis`);
const sanitizedProductNameValidator = () => yup
    .string()
    .transform((value) => (0, securityUtils_js_1.sanitizeProductName)(value))
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(100, "Le nom ne peut pas dépasser 100 caractères")
    .required("Le nom est requis");
const sanitizedDescriptionValidator = () => yup
    .string()
    .transform((value) => (0, securityUtils_js_1.sanitizeDescription)(value))
    .min(10, "La description doit contenir au moins 10 caractères")
    .max(2000, "La description ne peut pas dépasser 2000 caractères")
    .required("La description est requise");
// 🔐 Validation sécurisée pour la création d'un produit
exports.createProductSchema = yup.object().shape({
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
        .oneOf(["PREMIUM", "A_LA_UNE", "TOP_ANNONCE", "URGENT"], "Type de forfait invalide")
        .nullable(),
    images: yup
        .array()
        .of(yup.mixed())
        .min(1, "Au moins une image est requise")
        .max(5, "Maximum 5 images"),
});
// Validation pour la revue d'un produit (validation/rejet)
exports.reviewProductSchema = yup.object().shape({
    action: yup
        .string()
        .oneOf(["validate", "reject"], "Action invalide")
        .required("L'action est requise"),
});
