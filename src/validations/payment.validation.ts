import * as yup from 'yup';
import { PHONE_REGEX } from '../services/forfait.service.js'; // ✅ Import regex unifiée

export const initiatePaymentSchema = yup.object({
  productId: yup.string()
    .uuid('L\'ID du produit doit être un UUID valide')
    .required('L\'ID du produit est requis'),
  forfaitId: yup.string()
    .uuid('L\'ID du forfait doit être un UUID valide')
    .required('L\'ID du forfait est requis'),
  phoneNumber: yup.string()
    .test('phone-format', 'Numéro de téléphone invalide (format: 237XXXXXXXX ou XXXXXXXX)', (value) => {
      return value ? PHONE_REGEX.test(value.replace(/\s+/g, '')) : false;
    })
    .required('Le numéro de téléphone est requis'),
  paymentMethod: yup.string()
    .oneOf(['MOBILE_MONEY', 'ORANGE_MONEY'], 'Méthode de paiement non supportée')
    .required('La méthode de paiement est requise')
});

export const checkPaymentSchema = yup.object({
  paymentId: yup.string()
    .uuid('L\'ID du paiement doit être un UUID valide')
    .required('L\'ID du paiement est requis')
});