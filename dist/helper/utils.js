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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
class Utils {
    /**
     * Sauvegarde un fichier uploadé dans le dossier public/uploads
     * @param file Fichier uploadé
     * @param saveRelatifPath Chemin relatif de sauvegarde
     * @returns Promise résolue avec le chemin relatif du fichier sauvegardé
     */
    static saveFile(file, saveRelatifPath) {
        return __awaiter(this, void 0, void 0, function* () {
            const extension = file.mimetype.split("/")[1];
            const name = `${Date.now()}.${extension}`;
            const absolutePath = node_path_1.default.join(__dirname, `/../../public/uploads`, saveRelatifPath);
            if (!node_fs_1.default.existsSync(absolutePath)) {
                yield promises_1.default.mkdir(absolutePath, { recursive: true });
            }
            return new Promise((resolve, reject) => {
                file.mv(node_path_1.default.join(absolutePath, name), (err) => {
                    if (err)
                        return reject(err);
                    return resolve(`/uploads/${saveRelatifPath}/${name}`);
                });
            });
        });
    }
    /**
     * Met à jour un fichier en remplaçant l'ancien si spécifié
     * @param file Nouveau fichier uploadé
     * @param relativeFilePath Chemin relatif du nouveau fichier
     * @param oldRelativeFilePath Chemin relatif de l'ancien fichier (optionnel)
     * @returns Promise résolue avec le chemin relatif du nouveau fichier
     */
    static updateFile(file_1, relativeFilePath_1) {
        return __awaiter(this, arguments, void 0, function* (file, relativeFilePath, oldRelativeFilePath = null) {
            const extension = file.mimetype.split("/")[1];
            const name = `${Date.now()}.${extension}`;
            const oldAbsolutePath = oldRelativeFilePath
                ? node_path_1.default.join(__dirname, `/../../public`, oldRelativeFilePath)
                : null;
            const absolutePath = node_path_1.default.join(__dirname, `/../../public`, relativeFilePath);
            // Vérifie si le dossier existe
            if (!node_fs_1.default.existsSync(node_path_1.default.dirname(absolutePath))) {
                yield promises_1.default.mkdir(node_path_1.default.dirname(absolutePath), { recursive: true });
            }
            return new Promise((resolve, reject) => {
                file.mv(node_path_1.default.join(absolutePath, name), (err) => __awaiter(this, void 0, void 0, function* () {
                    if (err)
                        return reject(err);
                    // Supprime l'ancien fichier s'il existe
                    if (oldAbsolutePath && node_fs_1.default.existsSync(oldAbsolutePath)) {
                        try {
                            yield promises_1.default.unlink(oldAbsolutePath);
                        }
                        catch (err) {
                            console.error("Erreur lors de la suppression de l'ancien fichier:", err);
                        }
                    }
                    return resolve(`/uploads/${relativeFilePath}/${name}`);
                }));
            });
        });
    }
    /**
     * Supprime un fichier
     * @param relativeFilePath Chemin relatif du fichier à supprimer
     * @returns Promise résolue avec un booléen indiquant si la suppression a réussi
     */
    static deleteFile(relativeFilePath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const absolutePath = node_path_1.default.join(__dirname, `/../../public`, relativeFilePath);
                yield promises_1.default.access(absolutePath);
                yield promises_1.default.unlink(absolutePath);
                return true;
            }
            catch (err) {
                console.error("Une erreur est survenue lors de la suppression du fichier :", err.message);
                return false;
            }
        });
    }
    /**
     * Convertit un chemin relatif en URL absolue
     * @param req Objet Request d'Express
     * @param relativePath Chemin relatif du fichier
     * @returns URL absolue du fichier
     */
    static resolveFileUrl(req, relativePath) {
        if (relativePath.startsWith("data:") ||
            relativePath.startsWith("http://") ||
            relativePath.startsWith("https://")) {
            return relativePath;
        }
        const cleanPath = relativePath.startsWith("/")
            ? relativePath
            : `/${relativePath}`;
        return `${req.protocol}://${req.get("host")}/public${cleanPath}`;
    }
}
exports.default = Utils;
