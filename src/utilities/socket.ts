import { Server as IOServer } from "socket.io";
import { Server as HttpServer } from "http";

let io: IOServer | null = null;

export const initSockets = (server: HttpServer) => {
  io = new IOServer(server, {
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
    socket.on("join", (userId: string) => {
      if (userId) {
        socket.join(userId);
        // Socket a rejoint la room utilisateur
      }
    });

    // client peut émettre 'leave' pour quitter sa room
    socket.on("leave", (userId: string) => {
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

export const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
};
