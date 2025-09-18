"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIO = exports.initSockets = void 0;
const socket_io_1 = require("socket.io");
let io = null;
const initSockets = (server) => {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: [
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:5174",
                "http://127.0.0.1:5174",
            ],
            credentials: true,
        },
    });
    io.on("connection", (socket) => {
        // Socket connecté
        // client doit émettre 'join' avec son userId pour rejoindre sa room
        socket.on("join", (userId) => {
            if (userId) {
                socket.join(userId);
                // Socket a rejoint la room utilisateur
            }
        });
        // client peut émettre 'leave' pour quitter sa room
        socket.on("leave", (userId) => {
            if (userId) {
                socket.leave(userId);
                // Socket a quitté la room utilisateur
            }
        });
        socket.on("disconnect", () => {
            // Socket déconnecté
        });
    });
    return io;
};
exports.initSockets = initSockets;
const getIO = () => {
    if (!io)
        throw new Error("Socket.io not initialized");
    return io;
};
exports.getIO = getIO;
