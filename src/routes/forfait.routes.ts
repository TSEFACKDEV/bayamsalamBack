import express from "express";
import {
  activateForfait,
  deactivateForfait,
  getAllForfaits,
  getProductForfaits,
} from "../controllers/forfait.controller.js";
import { authenticate, isAdmin } from "../middlewares/auth.middleware.js";
import checkPermission from "../middlewares/checkPermission.js";

const router = express.Router();

// Récupérer tous les forfaits disponibles (public)
router.get("/", getAllForfaits);

// Récupérer les forfaits actifs d'un produit (public)
router.get("/product/:productId", getProductForfaits);

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

export default router;
