import { Router } from "express";
import {
  listNotifications,
  markRead,
  markAllAsRead,
} from "../controllers/notification.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", authenticate, listNotifications);
router.patch("/:id/read", authenticate, markRead);
router.patch("/mark-all-read", authenticate, markAllAsRead);

export default router;
