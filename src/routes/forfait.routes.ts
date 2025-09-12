import express from "express";
import { activateForfait } from "../controllers/forfait.controller.js";
import { authenticate, isAdmin } from "../middlewares/auth.middleware.js";
import checkPermission from "../middlewares/checkPermission.js";

const router = express.Router();

// Activation par admin (sans paiement)
router.post("/activate", authenticate, checkPermission("ASSIGN_FORFAIT"),  activateForfait);



export default router;