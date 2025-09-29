"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const forfait_controller_js_1 = require("../controllers/forfait.controller.js");
const auth_middleware_js_1 = require("../middlewares/auth.middleware.js");
const checkPermission_js_1 = __importDefault(require("../middlewares/checkPermission.js"));
const router = express_1.default.Router();
// Récupérer tous les forfaits disponibles (public)
router.get("/", forfait_controller_js_1.getAllForfaits);
// Récupérer les forfaits actifs d'un produit (public)
router.get("/product/:productId", forfait_controller_js_1.getProductForfaits);
// Activation par admin (sans paiement)
router.post("/activate", auth_middleware_js_1.authenticate, (0, checkPermission_js_1.default)("ASSIGN_FORFAIT"), forfait_controller_js_1.activateForfait);
// Désactivation par admin
router.post("/deactivate", auth_middleware_js_1.authenticate, (0, checkPermission_js_1.default)("ASSIGN_FORFAIT"), forfait_controller_js_1.deactivateForfait);
exports.default = router;
