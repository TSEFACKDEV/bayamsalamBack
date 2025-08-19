import express from "express";
import { activateForfait, payAndActivateForfait, monetbilNotification } from "../controllers/forfait.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import checkPermission from "../middlewares/checkPermission.js";

const router = express.Router();

// Activation par admin (sans paiement)
router.post("/activate", authenticate, checkPermission("PRODUCT_UPDATE"), activateForfait);

// Paiement et activation par utilisateur
router.post("/pay", authenticate, payAndActivateForfait);

// Callback Monetbil (notification de paiement)
router.post("/monetbil/notifications", monetbilNotification);

export default router;