"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const report_controller_js_1 = require("../controllers/report.controller.js");
const auth_middleware_js_1 = require("../middlewares/auth.middleware.js");
const checkPermission_js_1 = __importDefault(require("../middlewares/checkPermission.js"));
const router = express_1.default.Router();
router.use(auth_middleware_js_1.authenticate);
// Routes pour la gestion des signalements (Admin seulement)
router.get('/', (0, checkPermission_js_1.default)('REPORT_VIEW_ALL'), report_controller_js_1.getAllReports);
router.get('/statistics', (0, checkPermission_js_1.default)('REPORT_VIEW_ALL'), report_controller_js_1.getReportsStatistics);
router.get('/:id', (0, checkPermission_js_1.default)('REPORT_VIEW'), report_controller_js_1.getReportById);
router.put('/:id/process', (0, checkPermission_js_1.default)('REPORT_PROCESS'), report_controller_js_1.processReport);
exports.default = router;
