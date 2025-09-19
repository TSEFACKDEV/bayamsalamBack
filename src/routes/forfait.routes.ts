import express from "express";
import {
  activateForfait,
  deactivateForfait,
  initiateForfaitPayment,
  confirmForfaitPayment,
} from "../controllers/forfait.controller.js";
import { authenticate, isAdmin } from "../middlewares/auth.middleware.js";
import checkPermission from "../middlewares/checkPermission.js";

const router = express.Router();

// Activation par admin (sans paiement)
router.post(
  "/activate",
  authenticate,
  checkPermission("ASSIGN_FORFAIT"),
  activateForfait
);

// Désactivation par admin
router.post(
  "/deactivate",
  authenticate,
  checkPermission("ASSIGN_FORFAIT"),
  deactivateForfait
);

// Initier paiement (utilisateur choisit forfait -> obtenir URL iframe)
router.post("/initiate", authenticate, initiateForfaitPayment);

// Endpoint de confirmation (webhook ou frontend redirect)
router.post("/confirm", confirmForfaitPayment); // Webhook FuturaPay - pas d'auth nécessaire

export default router;
