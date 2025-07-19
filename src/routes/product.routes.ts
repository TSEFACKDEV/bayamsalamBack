import express from "express"
import { deleteProduct, getAllProducts, getProductById, updateProduct } from "../controllers/product.controller"


const router = express.Router()

// router.post("/",createProduct )
router.get("/", getAllProducts )
router.get("/:id",getProductById )
router.put("/:id", updateProduct )
router.delete("/:id", deleteProduct)

export default router