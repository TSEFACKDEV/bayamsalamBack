"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const contact_controller_js_1 = require("../controllers/contact.controller.js");
const router = express_1.default.Router();
router.post('/', contact_controller_js_1.createContact);
exports.default = router;
