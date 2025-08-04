"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const city_controller_js_1 = require("../controllers/city.controller.js");
const auth_middleware_js_1 = require("../middlewares/auth.middleware.js");
const checkPermission_js_1 = __importDefault(require("../middlewares/checkPermission.js"));
const router = express_1.default.Router();
router.get("/", city_controller_js_1.getAllCities);
router.get("/:id", city_controller_js_1.getCityById);
router.use(auth_middleware_js_1.authenticate);
router.post("/", (0, checkPermission_js_1.default)("CITY_CREATE"), city_controller_js_1.createCity);
router.put("/:id", (0, checkPermission_js_1.default)("CITY_UPDATE"), city_controller_js_1.updateCity);
router.delete("/:id", (0, checkPermission_js_1.default)("CITY_DELETE"), city_controller_js_1.deleteCity);
exports.default = router;
