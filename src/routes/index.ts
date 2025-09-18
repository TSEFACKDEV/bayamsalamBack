import categoryRouter from "./category.routes.js";
import cityRouter from "./city.routes.js";
import authRouter from "./auth.routes.js";
import userRouter from "./user.routes.js";
import productRouter from "./product.routes.js";
import reviewRouter from "./review.routes.js";
import favoriteRouter from "./favorite.routes.js";
import contactRouter from "./contact.routes.js";
import roleRouter from "./role.routes.js";
import permissionRouter from "./permission.routes.js";
import forfaitRouter from "./forfait.routes.js";
import notificationRouter from "./notification.routes.js";
import reportRouter from "./report.routes.js";
import cacheRouter from "./cache.routes.js"; // 🚀 Ajout des routes cache
import securityRouter from "./security.routes.js"; // 🔐 Ajout du monitoring de sécurité
import csrfRouter from "./csrf.routes.js"; // 🛡️ Ajout des routes CSRF
import express from "express";

const router = express.Router();

router.use("/category", categoryRouter);
router.use("/city", cityRouter);
router.use("/auth", authRouter);
router.use("/user", userRouter);
router.use("/product", productRouter);
router.use("/review", reviewRouter);
router.use("/favorite", favoriteRouter);
router.use("/contact", contactRouter);
router.use("/role", roleRouter);
router.use("/permission", permissionRouter);
router.use("/forfait", forfaitRouter);
router.use("/notification", notificationRouter);
router.use("/reports", reportRouter);
router.use("/cache", cacheRouter); // 🚀 Endpoint de monitoring cache
router.use("/security", securityRouter); // 🔐 Endpoint de monitoring sécurité
router.use("/csrf", csrfRouter); // 🛡️ Endpoints de gestion CSRF

export default router;
