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
exports.initializeForfaits = initializeForfaits;
const prisma_client_js_1 = __importDefault(require("../model/prisma.client.js"));
const client_1 = require("@prisma/client");
/**
 * ✅ INITIALISATION AUTOMATIQUE DES FORFAITS
 * S'assure que les forfaits de base existent en base de données
 */
function initializeForfaits() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('🚀 Initialisation des forfaits...');
            const forfaitsToCreate = [
                {
                    type: client_1.ForfaitType.URGENT,
                    price: 1000,
                    duration: 3,
                    description: 'Forfait Urgent - Mise en avant pendant 3 jours'
                },
                {
                    type: client_1.ForfaitType.TOP_ANNONCE,
                    price: 3000,
                    duration: 14,
                    description: 'Forfait Top Annonce - En tête de liste pendant 14 jours'
                },
                {
                    type: client_1.ForfaitType.A_LA_UNE,
                    price: 7000,
                    duration: 30,
                    description: 'Forfait À la Une - Page d\'accueil pendant 30 jours'
                },
                {
                    type: client_1.ForfaitType.PREMIUM,
                    price: 10000,
                    duration: 60,
                    description: 'Forfait Premium - Tous avantages pendant 60 jours'
                }
            ];
            let createdCount = 0;
            let updatedCount = 0;
            for (const forfaitData of forfaitsToCreate) {
                // Rechercher d'abord s'il existe déjà
                const existingForfait = yield prisma_client_js_1.default.forfait.findFirst({
                    where: { type: forfaitData.type }
                });
                if (existingForfait) {
                    // Mettre à jour s'il existe
                    yield prisma_client_js_1.default.forfait.update({
                        where: { id: existingForfait.id },
                        data: {
                            price: forfaitData.price,
                            duration: forfaitData.duration,
                            description: forfaitData.description
                        }
                    });
                    updatedCount++;
                    console.log(`📝 Forfait ${forfaitData.type} mis à jour`);
                }
                else {
                    // Créer s'il n'existe pas
                    yield prisma_client_js_1.default.forfait.create({
                        data: forfaitData
                    });
                    createdCount++;
                    console.log(`✅ Forfait ${forfaitData.type} créé`);
                }
            }
            console.log(`🎉 Initialisation terminée: ${createdCount} créés, ${updatedCount} mis à jour`);
            // Afficher tous les forfaits pour vérification
            const allForfaits = yield prisma_client_js_1.default.forfait.findMany({
                select: { type: true, price: true, duration: true }
            });
            console.log('📋 Forfaits disponibles:', allForfaits);
        }
        catch (error) {
            console.error('❌ Erreur lors de l\'initialisation des forfaits:', error);
            throw error;
        }
    });
}
exports.default = initializeForfaits;
