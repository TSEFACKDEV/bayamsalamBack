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
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Vérifier si l'utilisateur existe déjà
        const existingUser = await prisma.user.findFirst({
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

        // Si l'utilisateur existe, retourner cet utilisateur
        if (existingUser) {
          // Mettre à jour googleId s'il n'existe pas encore
          if (!existingUser.googleId) {
            await prisma.user.update({
              where: { id: existingUser.id },
              data: {
                googleId: profile.id,
                lastConnexion: new Date(),
              },
            });
          } else {
            // Mettre à jour la dernière connexion
            await prisma.user.update({
              where: { id: existingUser.id },
              data: { lastConnexion: new Date() },
            });
          }
          
          return done(null, existingUser);
        }

        // Créer un nouvel utilisateur
        const names = profile.displayName.split(" ");
        const firstName = names[0] || "";
        const lastName = names.slice(1).join(" ") || "";
        
        const newUser = await prisma.user.create({
          data: {
            email: profile.emails?.[0]?.value || "",
            firstName,
            lastName,
            password: "", // Pas de mot de passe pour l'authentification Google
            googleId: profile.id,
            avatar: profile.photos?.[0]?.value,
            isVerified: true, // L'email est déjà vérifié par Google
            status: "ACTIVE",
          },
        });

        // Ajout automatique du rôle USER
        const userRole = await prisma.role.findUnique({ where: { name: "USER" } });
        if (userRole) {
          await prisma.userRole.create({
            data: {
              userId: newUser.id,
              roleId: userRole.id,
            },
          });
        }

        // Créer notification de bienvenue
        await createNotification(
          newUser.id,
          "Bienvenue sur BuyamSale",
          "Votre compte a été créé avec succès via Google. Bienvenue !",
          {
            type: "WELCOME",
            link: "/",
          }
        );

        return done(null, newUser);
      } catch (error) {
        return done(error as Error, undefined);
      }
    }
  )
);

export default passport;