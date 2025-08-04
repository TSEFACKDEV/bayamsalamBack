"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const response_js_1 = __importDefault(require("../helper/response.js"));
const errorHandler = (err, req, res, next) => {
    console.log(err.stack);
    // Erreurs de validation Yup
    if (err.name === 'ValidationError') {
        return response_js_1.default.error(res, 'Validation failed', err.errors);
    }
    // Erreurs JWT
    if (err.name === 'JsonWebTokenError') {
        return response_js_1.default.error(res, 'Invalid token', err.errors);
    }
    if (err.name === 'TokenExpiredError') {
        return response_js_1.default.error(res, 'Token expired', null);
    }
    // Erreur Prisma
    if (err.code === 'P2002') {
        return response_js_1.default.error(res, 'Duplicate field value', null);
    }
    if (err.code === 'P2025') {
        return response_js_1.default.error(res, 'Record not found', null);
    }
    // Erreur par défaut
    return response_js_1.default.error(res, 'Internal server error', err);
};
exports.errorHandler = errorHandler;
