import prisma from '../model/prisma.client';

class Log {
  /**
   * Enregistre une connexion utilisateur.
   * @param {string} userId - ID de l'utilisateur.
   * @param {string} ipAddress - Adresse IP de l'utilisateur.
   * @param {string} userAgent - Agent utilisateur (navigateur).
   */
  static logConnection = async (
    userId: string,
    ipAddress: any,
    userAgent: string
  ) => {
    await prisma.connectionLog.create({
      data: {
        userId,
        ipAddress,
        userAgent,
      },
    });
  };

  /**
   * Récupère l'historique des connexions d'un utilisateur.
   * @param {string} userId - ID de l'utilisateur.
   * @returns {Array} - Liste des connexions.
   */
  static getConnectionLogs = async (userId: string) => {
    return await prisma.connectionLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  };
}

export default Log;
