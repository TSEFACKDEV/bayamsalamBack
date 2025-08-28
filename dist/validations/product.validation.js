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
// Validation pour la création d'un produit
exports.createProductSchema = yup.object().shape({
    name: yup.string().required("Le nom est requis"),
    price: yup
        .number()
        .typeError("Le prix doit être un nombre")
        .required("Le prix est requis"),
    quantity: yup
        .number()
        .typeError("La quantité doit être un nombre")
        .required("La quantité est requise"),
    description: yup.string().required("La description est requise"),
    categoryId: yup.string().required("La catégorie est requise"),
    cityId: yup.string().required("La ville est requise"),
    etat: yup.string().required("L'état est requis"),
    quartier: yup.string().nullable(),
    telephone: yup.string().nullable(),
    forfaitType: yup.string().nullable(),
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
