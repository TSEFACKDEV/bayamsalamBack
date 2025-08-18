import express from "express";
import {
  forgotPassword,
  getUserProfile,
  login,
  logout,
  register,
  resetPassword,
  verifyOTP,
  refreshToken,
} from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/verify-otp", verifyOTP);
router.post("/login", login);
router.post("/logout", logout);
router.post("/refresh-token", refreshToken);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

router.use(authenticate);
router.get("/me", getUserProfile);

export default router;
