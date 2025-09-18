"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const permission_controller_js_1 = require("../controllers/permission.controller.js");
const checkPermission_js_1 = __importDefault(require("../middlewares/checkPermission.js"));
const auth_middleware_js_1 = require("../middlewares/auth.middleware.js");
const router = express_1.default.Router();
router.use(auth_middleware_js_1.authenticate);
router.get('/', (0, checkPermission_js_1.default)('PERMISSION_READ'), permission_controller_js_1.getAll);
router.get('/:id', (0, checkPermission_js_1.default)('PERMISSION_READ'), permission_controller_js_1.getById);
router.post('/', (0, checkPermission_js_1.default)('PERMISSION_CREATE'), permission_controller_js_1.create);
router.put('/:id', (0, checkPermission_js_1.default)('PERMISSION_UPDATE'), permission_controller_js_1.update);
router.delete('/:id', (0, checkPermission_js_1.default)('PERMISSION_DELETE'), permission_controller_js_1.destroy);
router.post('/assign-permissions', (0, checkPermission_js_1.default)('PERMISSION_ASSIGN'), permission_controller_js_1.assignPermissionsToRole);
router.post('/remove-permissions', (0, checkPermission_js_1.default)('PERMISSION_ASSIGN'), permission_controller_js_1.removePermissionsFromRole);
exports.default = router;
