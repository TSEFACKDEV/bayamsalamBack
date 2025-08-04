"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const favorite_controller_js_1 = require("../controllers/favorite.controller.js");
const auth_middleware_js_1 = require("../middlewares/auth.middleware.js");
const router = express_1.default.Router();
router.use(auth_middleware_js_1.authenticate);
router.post("/add", favorite_controller_js_1.addToFavorites);
router.delete("/remove", favorite_controller_js_1.removeFromFavorites);
exports.default = router;
