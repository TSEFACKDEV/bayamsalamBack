import categoryRouter from './category.routes'
import cityRouter from './city.routes'
import authRouter from './auth.routes'
import productRouter from './product.routes'
import express from 'express'

const router = express.Router()
router.use("/category",categoryRouter)
router.use("/city",cityRouter)
router.use("/auth",authRouter)
router.use("/product",productRouter)

export default router

