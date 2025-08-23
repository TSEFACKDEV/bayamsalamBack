"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const review_controller_js_1 = require("../controllers/review.controller.js");
const auth_middleware_js_1 = require("../middlewares/auth.middleware.js");
const router = express_1.default.Router();
// Routes publiques
router.get("/", review_controller_js_1.getAllReviews);
router.get("/seller/:userId", review_controller_js_1.getReviewsForUser);
// Routes protégées (authentification requise)
router.use(auth_middleware_js_1.authenticate);
router.get("/my-reviews", review_controller_js_1.getReviewsByUser);
router.post("/", review_controller_js_1.createReview);
router.put("/:id", review_controller_js_1.updateReview);
router.delete("/:id", review_controller_js_1.deleteReview);
// Route publique avec paramètre (doit être après les routes spécifiques)
router.get("/:id", review_controller_js_1.getReviewById);
exports.default = router;
