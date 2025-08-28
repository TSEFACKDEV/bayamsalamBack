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
import { forgotPasswordSchema, loginSchema, logoutSchema, refreshTokenSchema, registerSchema, resetPasswordSchema, verifyOTPSchema } from "../validations/auth.validation.js";
import validate from "../middlewares/validation.js";

const router = express.Router();

router.post("/register", validate(registerSchema), register);
router.post("/verify-otp", validate(verifyOTPSchema), verifyOTP);
router.post("/login", validate(loginSchema), login);
router.post("/logout", validate(logoutSchema), logout);
router.post("/refresh-token", validate(refreshTokenSchema), refreshToken);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);

router.use(authenticate);
router.get("/me", getUserProfile);

export default router;
