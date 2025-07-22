import categoryRouter from './category.routes.js';
import cityRouter from './city.routes.js';
import authRouter from './auth.routes.js';
import express from 'express';
const router = express.Router();
router.use("/category", categoryRouter);
router.use("/city", cityRouter);
router.use("/auth", authRouter);
export default router;
