"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const validate = (schema) => (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield schema.validate(req.body);
        next();
    }
    catch (err) {
        // En mode développement, logguer les erreurs de validation pour debug
        if (process.env.NODE_ENV === "development") {
            console.log("❌ Erreur de validation Yup:", err.message);
            console.log("📄 Champ en erreur:", err.path);
        }
        res.status(400).json({ error: err.errors });
    }
});
exports.default = validate;
