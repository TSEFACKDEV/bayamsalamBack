import { Router } from "express";
import { listNotifications, markRead } from "../controllers/notification.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";


const router = Router();

router.get("/", authenticate, listNotifications);
router.patch("/:id/read", authenticate, markRead);

export default router;