import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
const prisma = new PrismaClient();

const PERMISSIONS = [
  "USER_CREATE",
  "USER_GET_ALL",
  "USER_GET_BY_ID",
  "USER_UPDATE",
  "USER_DELETE",
  "USER_REPORT", // ✅ AJOUT de la permission de signalement
  "REPORT_VIEW_ALL", // ✅ Voir tous les signalements (Admin)
  "REPORT_VIEW", // ✅ Voir un signalement spécifique (Admin)
  "REPORT_PROCESS", // ✅ Traiter les signalements (Admin)
  "ROLE_GET_ALL",
  "ROLE_GET_BY_ID",
  "ROLE_CREATE",
  "ROLE_UPDATE",
  "ROLE_DELETE",
  "ROLE_ASSIGN",
  "PRODUCT_REVIEW",
  "PRODUCT_PREVIEW",
  "PRODUCT_CREATE",
  "PRODUCT_UPDATE",
  "PRODUCT_DELETE",
  "PRODUCT_READ",
  "PERMISSION_READ",
  "PERMISSION_CREATE",
  "PERMISSION_UPDATE",
  "PERMISSION_DELETE",
  "PERMISSION_ASSIGN",
  "CITY_CREATE",
  "CITY_UPDATE",
  "CITY_DELETE",
  "CATEGORY_CREATE",
  "CATEGORY_UPDATE",
  "CATEGORY_DELETE",
  "USER_GET_ALL_REPORTS",
  "USER_REPORT",
  "ASSIGN_FORFAIT",
  "VIEW_FORFAIT",
  "ACTIVATE_FORFAIT",
  "DEACTIVATE_FORFAIT",
  // 🚀 PERMISSIONS CACHE - Ajout des permissions manquantes
  "ADMIN_READ", // Permission pour consulter les statistiques admin/cache
  "ADMIN_WRITE", // Permission pour effectuer des actions admin/cache
];

const USER_PERMISSIONS = [
  "PRODUCT_CREATE",
  "PRODUCT_UPDATE",
  "PRODUCT_DELETE",
  "USER_UPDATE",
  "USER_REPORT", // ✅ AJOUT : Les utilisateurs peuvent signaler d'autres utilisateurs
];

const cities = [
  { name: "Douala" },
  { name: "Yaoundé" },
  { name: "Bamenda" },
  { name: "Garoua" },
  { name: "Maroua" },
  { name: "Bertoua" },
  { name: "Ebolowa" },
  { name: "Bafoussam" },
  { name: "Dschang" },
  { name: "Limbe" },
  { name: "Buea" },
  { name: "Nkongsamba" },
];

const categories = [
  { name: "Électronique", description: "Appareils et gadgets électroniques" },
  {
    name: "Vêtements",
    description: "Vêtements pour hommes, femmes et enfants",
  },
  { name: "Meubles", description: "Meubles pour la maison et le bureau" },
  { name: "Jouets", description: "Jouets pour enfants de tous âges" },
  { name: "Livres", description: "Livres de tous genres" },
  { name: "Sport", description: "Équipements et vêtements de sport" },
  { name: "Automobile", description: "Véhicules et accessoires automobiles" },
  { name: "Immobilier", description: "Biens immobiliers et terrains" },
  { name: "Services", description: "Services divers" },
  { name: "Rencontres", description: "Trouvez l'amour" },
  { name: "Autres", description: "Catégories diverses" },
];

async function main() {
  // Créer toutes les permissions
  for (const key of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { permissionKey: key },
      update: {},
      create: {
        permissionKey: key,
        title: key.replace(/_/g, " "),
        description: `Permission for ${key}`,
      },
    });
  }

  // Créer le rôle USER
  const userRole = await prisma.role.upsert({
    where: { name: "USER" },
    update: {},
    create: {
      name: "USER",
      description: "Utilisateur standard",
    },
  });

  // Assigner les permissions USER_PERMISSIONS au rôle USER
  for (const key of USER_PERMISSIONS) {
    const permission = await prisma.permission.findUnique({
      where: { permissionKey: key },
    });
    if (permission) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: userRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: { roleId: userRole.id, permissionId: permission.id },
      });
    }
  }

  // Créer le rôle SUPER_ADMIN
  const superAdminRole = await prisma.role.upsert({
    where: { name: "SUPER_ADMIN" },
    update: {},
    create: {
      name: "SUPER_ADMIN",
      description: "Super administrateur",
    },
  });

  // Assigner toutes les permissions au rôle SUPER_ADMIN
  const allPermissions = await prisma.permission.findMany();
  for (const permission of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: superAdminRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: { roleId: superAdminRole.id, permissionId: permission.id },
    });
  }

  // Ajouter les villes
  for (const city of cities) {
    await prisma.city.upsert({
      where: { name: city.name },
      update: {},
      create: city,
    });
  }

  // Ajouter des catégories
  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      create: {
        name: category.name,
        description: category.description,
      },
    });
  }

  // Créer les forfaits
  await prisma.forfait.createMany({
    data: [
      {
        type: "URGENT",
        price: 100,
        duration: 1,
        description: "Badge urgent sur l'annonce",
      },
      {
        type: "TOP_ANNONCE",
        price: 200,
        duration: 1,
        description: "Annonce en tête de page",
      },
      {
        type: "PREMIUM",
        price: 500,
        duration: 1,
        description: "Tous les privilèges",
      },
      {
        type: "A_LA_UNE",
        price: 500,
        duration: 1,
        description: "s'affiche toujours en page d'acceuille",
      },
    ],
    skipDuplicates: true,
  });

  // Création du super admin
  const superAdminEmail = "buyandsalecmr@gmail.com";
  let superAdmin = await prisma.user.findUnique({
    where: { email: superAdminEmail },
  });
  if (!superAdmin) {
    superAdmin = await prisma.user.create({
      data: {
        firstName: "NANA MBEZOU",
        lastName: "Armand",
        email: superAdminEmail,
        password: await hash("Buy&sale237", 10),
        phone: "+237 690984805",
        status: "ACTIVE",
        isVerified: true,
      },
    });
    console.log("Super admin créé avec succès !");
  } else {
    console.log("Le super admin existe déjà.");
  }

  // Assigner le rôle SUPER_ADMIN au super admin
  const alreadyAssigned = await prisma.userRole.findUnique({
    where: {
      userId_roleId: { userId: superAdmin.id, roleId: superAdminRole.id },
    },
  });
  if (!alreadyAssigned) {
    await prisma.userRole.create({
      data: {
        userId: superAdmin.id,
        roleId: superAdminRole.id,
      },
    });
    console.log("Rôle SUPER_ADMIN assigné au super admin.");
  } else {
    console.log("Le super admin a déjà le rôle SUPER_ADMIN.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
