import express from 'express';
import {
  initiatePayment,
  checkPaymentStatus,
  getUserPayments,
  campayWebhook,
} from '../controllers/payment.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import validate from '../middlewares/validation.js';
import { initiatePaymentSchema } from '../validations/payment.validation.js';

const router = express.Router();

// Initier un paiement de forfait
router.post(
  '/initiate',
  authenticate,
  validate(initiatePaymentSchema),
  initiatePayment
);

// Vérifier le statut d'un paiement
router.get(
  '/:paymentId/status',
  authenticate,
  checkPaymentStatus
);

// Obtenir l'historique des paiements
router.get(
  '/history',
  authenticate,
  getUserPayments
);

// Webhook Campay
router.post('/webhook/campay', campayWebhook);

export default router;