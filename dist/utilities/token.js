"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = exports.generateResToken = exports.generateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_js_1 = __importDefault(require("../config/config.js"));
const generateToken = (payload) => {
    return jsonwebtoken_1.default.sign(payload, config_js_1.default.jwtSecret, { expiresIn: "1d" });
};
exports.generateToken = generateToken;
const generateResToken = (payload) => {
    return jsonwebtoken_1.default.sign(payload, config_js_1.default.jwtSecret, { expiresIn: "1h" });
};
exports.generateResToken = generateResToken;
const verifyToken = (token) => {
    return jsonwebtoken_1.default.verify(token, config_js_1.default.jwtSecret);
};
exports.verifyToken = verifyToken;
