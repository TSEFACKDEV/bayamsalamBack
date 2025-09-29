"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const payment_controller_js_1 = require("../controllers/payment.controller.js");
const auth_middleware_js_1 = require("../middlewares/auth.middleware.js");
const validation_js_1 = __importDefault(require("../middlewares/validation.js"));
const payment_validation_js_1 = require("../validations/payment.validation.js");
const router = express_1.default.Router();
// Initier un paiement de forfait
router.post('/initiate', auth_middleware_js_1.authenticate, (0, validation_js_1.default)(payment_validation_js_1.initiatePaymentSchema), payment_controller_js_1.initiatePayment);
// Vérifier le statut d'un paiement
router.get('/:paymentId/status', auth_middleware_js_1.authenticate, payment_controller_js_1.checkPaymentStatus);
// Obtenir l'historique des paiements
router.get('/history', auth_middleware_js_1.authenticate, payment_controller_js_1.getUserPayments);
// Webhook Campay
router.post('/webhook/campay', payment_controller_js_1.campayWebhook);
exports.default = router;
