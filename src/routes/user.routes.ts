import express from "express";
import {
  createUser,
  deleteUser,
  getAllUsers,
  getUserById,
  reportUser,
  updateUser,
} from "../controllers/user.controller.js";
import { authenticate} from "../middlewares/auth.middleware.js";
import checkPermission from "../middlewares/checkPermission.js";

const router = express.Router();

router.use(authenticate);

router.post("/", checkPermission("USER_CREATE"), createUser);
router.get("/", checkPermission("USER_GET_ALL"), getAllUsers);
router.get("/:id", checkPermission("USER_GET_BY_ID"), getUserById);
router.put("/:id", checkPermission("USER_UPDATE"), updateUser);
router.delete("/:id", checkPermission("USER_DELETE"), deleteUser);
// route pour signaler un utilisateur
router.post("/report/:id", checkPermission("USER_REPORT"), reportUser);

export default router;
