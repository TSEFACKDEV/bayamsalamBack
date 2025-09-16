import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import prisma from "../model/prisma.client.js";
import env from "./config.js";
import { createNotification } from "../services/notification.service.js";

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

passport.use(
  new GoogleStrategy(
    {
      clientID: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackURL: env.GOOGLE_CALLBACK_URL,
      scope: ["profile", "email"],
      // Ajouter des options pour gérer les timeouts et conflits
      passReqToCallback: false,
      skipUserProfile: false,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Ajouter un délai aléatoire pour éviter les conflits de concurrence
        await new Promise((resolve) =>
          setTimeout(resolve, Math.random() * 500)
        );

        // Utiliser une transaction pour éviter les conditions de course
        const result = await prisma.$transaction(async (tx) => {
          // Vérifier si l'utilisateur existe déjà
          const existingUser = await tx.user.findFirst({
            where: {
              OR: [
                { email: profile.emails?.[0]?.value },
                { googleId: profile.id },
              ],
            },
            include: {
              roles: {
                include: {
                  role: true,
                },
              },
            },
          });

          // Si l'utilisateur existe, mettre à jour ses informations
          if (existingUser) {
            const updatedUser = await tx.user.update({
              where: { id: existingUser.id },
              data: {
                googleId: profile.id,
                lastConnexion: new Date(),
                // Mettre à jour l'avatar si il a changé
                ...(profile.photos?.[0]?.value && {
                  avatar: profile.photos[0].value,
                }),
              },
              include: {
                roles: {
                  include: {
                    role: true,
                  },
                },
              },
            });

            return updatedUser;
          }

          // Vérifier s'il y a déjà un utilisateur avec cet email
          const emailUser = await tx.user.findUnique({
            where: { email: profile.emails?.[0]?.value },
          });

          if (emailUser) {
            // Lier le compte Google à l'utilisateur existant
            const linkedUser = await tx.user.update({
              where: { id: emailUser.id },
              data: {
                googleId: profile.id,
                lastConnexion: new Date(),
                isVerified: true,
                ...(profile.photos?.[0]?.value && {
                  avatar: profile.photos[0].value,
                }),
              },
              include: {
                roles: {
                  include: {
                    role: true,
                  },
                },
              },
            });

            return linkedUser;
          }

          // Créer un nouvel utilisateur
          const names = profile.displayName?.split(" ") || ["", ""];
          const firstName = names[0] || "";
          const lastName = names.slice(1).join(" ") || "";

          const newUser = await tx.user.create({
            data: {
              email: profile.emails?.[0]?.value || "",
              firstName,
              lastName,
              password: "", // Pas de mot de passe pour l'authentification Google
              googleId: profile.id,
              avatar: profile.photos?.[0]?.value,
              isVerified: true, // L'email est déjà vérifié par Google
              status: "ACTIVE",
              lastConnexion: new Date(),
            },
          });

          // Ajout automatique du rôle USER
          const userRole = await tx.role.findUnique({
            where: { name: "USER" },
          });

          if (userRole) {
            await tx.userRole.create({
              data: {
                userId: newUser.id,
                roleId: userRole.id,
              },
            });
          }

          return newUser;
        });

        // Créer notification de bienvenue en dehors de la transaction
        // Seulement pour les nouveaux utilisateurs ou ceux qui se connectent pour la première fois aujourd'hui
        const isNewConnection =
          !result.lastConnexion ||
          new Date(result.lastConnexion).toDateString() !==
            new Date().toDateString();

        if (isNewConnection) {
          try {
            await createNotification(
              result.id,
              "Bienvenue sur BuyamSale",
              result.lastConnexion
                ? "Heureux de vous revoir sur BuyamSale !"
                : "Votre compte a été créé avec succès via Google. Bienvenue !",
              {
                type: "WELCOME",
                link: "/",
              }
            );
          } catch (notificationError) {
            // Log l'erreur mais ne pas faire échouer l'authentification
            console.error(
              "Erreur lors de la création de la notification:",
              notificationError
            );
          }
        }

        return done(null, result);
      } catch (error) {
        console.error("Erreur d'authentification Google:", error);
        return done(error as Error, undefined);
      }
    }
  )
);

export default passport;
