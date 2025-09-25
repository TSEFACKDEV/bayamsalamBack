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
exports.checkPaymentSchema = exports.initiatePaymentSchema = void 0;
const yup = __importStar(require("yup"));
const forfait_service_js_1 = require("../services/forfait.service.js"); // ✅ Import regex unifiée
exports.initiatePaymentSchema = yup.object({
    productId: yup.string()
        .uuid('L\'ID du produit doit être un UUID valide')
        .required('L\'ID du produit est requis'),
    forfaitId: yup.string()
        .uuid('L\'ID du forfait doit être un UUID valide')
        .required('L\'ID du forfait est requis'),
    phoneNumber: yup.string()
        .test('phone-format', 'Numéro de téléphone invalide (format: 237XXXXXXXX ou XXXXXXXX)', (value) => {
        return value ? forfait_service_js_1.PHONE_REGEX.test(value.replace(/\s+/g, '')) : false;
    })
        .required('Le numéro de téléphone est requis'),
    paymentMethod: yup.string()
        .oneOf(['MOBILE_MONEY', 'ORANGE_MONEY'], 'Méthode de paiement non supportée')
        .required('La méthode de paiement est requise')
});
exports.checkPaymentSchema = yup.object({
    paymentId: yup.string()
        .uuid('L\'ID du paiement doit être un UUID valide')
        .required('L\'ID du paiement est requis')
});
