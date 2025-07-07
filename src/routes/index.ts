import categoryRouter from './category.routes'
import cityRouter from './city.routes'
import express from 'express'

const router = express.Router()
router.use("/category",categoryRouter)
router.use("/city",cityRouter)

export default router

