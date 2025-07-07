import express from "express"
import { createCity, deleteCity, getAllCities, getCityById, updateCity } from "../controllers/city.controller"


const router = express.Router()

router.post("/", createCity)
router.get("/", getAllCities)
router.get("/:id", getCityById)
router.put("/:id", updateCity)
router.delete("/:id", deleteCity)

export default router