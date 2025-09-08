import express from "express";
import { activateForfait } from "../controllers/forfait.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import checkPermission from "../middlewares/checkPermission.js";

const router = express.Router();

// Activation par admin (sans paiement)
router.post("/activate", authenticate, checkPermission("PRODUCT_UPDATE"), activateForfait);



export default router;