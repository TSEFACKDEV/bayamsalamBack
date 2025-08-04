"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_controller_js_1 = require("../controllers/auth.controller.js");
const router = express_1.default.Router();
router.post("/register", auth_controller_js_1.register);
router.post("/verify-otp", auth_controller_js_1.verifyOTP);
router.post("/login", auth_controller_js_1.login);
router.post("/logout", auth_controller_js_1.logout);
router.post("/forgot-password", auth_controller_js_1.forgotPassword);
router.post("/reset-password", auth_controller_js_1.resetPassword);
exports.default = router;
