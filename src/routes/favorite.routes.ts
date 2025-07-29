import express from "express";
import { addToFavorites, removeFromFavorites } from "../controllers/favorite.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(authenticate);
router.post("/add", addToFavorites);
router.delete("/remove", removeFromFavorites);

export default router;