import express from "express";
import {
  assignPermissionsToRole,
  removePermissionsFromRole,
  create,
  destroy,
  getAll,
  getById,
  update,
} from "../controllers/permission.controller.js";
import checkPermission from "../middlewares/checkPermission.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(authenticate);
router.get("/", checkPermission("PERMISSION_READ"), getAll);
router.get("/:id", checkPermission("PERMISSION_READ"), getById);
router.post("/", checkPermission("PERMISSION_CREATE"), create);
router.put("/:id", checkPermission("PERMISSION_UPDATE"), update);
router.delete("/:id", checkPermission("PERMISSION_DELETE"), destroy);
router.post(
  "/assign-permissions",
  checkPermission("PERMISSION_ASSIGN"),
  assignPermissionsToRole
);
router.post(
  "/remove-permissions",
  checkPermission("PERMISSION_ASSIGN"),
  removePermissionsFromRole
);

export default router;
