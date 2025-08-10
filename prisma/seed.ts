import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const PERMISSIONS = [
  "USER_CREATE", "USER_GET_ALL", "USER_GET_BY_ID", "USER_UPDATE", "USER_DELETE",
  "ROLE_GET_ALL", "ROLE_GET_BY_ID", "ROLE_CREATE", "ROLE_UPDATE", "ROLE_DELETE", "ROLE_ASSIGN",
  "PRODUCT_REVIEW", "PRODUCT_PREVIEW", "PRODUCT_CREATE", "PRODUCT_UPDATE", "PRODUCT_DELETE",
  "PERMISSION_READ", "PERMISSION_CREATE", "PERMISSION_UPDATE", "PERMISSION_DELETE", "PERMISSION_ASSIGN",
  "CITY_CREATE", "CITY_UPDATE", "CITY_DELETE",
  "CATEGORY_CREATE", "CATEGORY_UPDATE", "CATEGORY_DELETE"
];

const USER_PERMISSIONS = [
  "PRODUCT_CREATE", "PRODUCT_UPDATE", "PRODUCT_DELETE"
];

const cities = [
  {name:"Douala"},
  {name:"Yaoundé"},
  {name:"Bamenda"},
  {name:"Garoua"},
  {name:"Maroua"},
  {name:"Bertoua"},
  {name:"Ebolowa"},
  {name:"Bafoussam"},
  {name:"Dschang"},
  {name:"Limbe"},
  {name:"Buea"},
  {name:"Nkongsamba"}
];

const categories = [
  { name: "Électronique", description:"Appareils et gadgets électroniques" },
  { name: "Vêtements", description:"Vêtements pour hommes, femmes et enfants" },
  { name: "Meubles", description:"Meubles pour la maison et le bureau" },
  { name: "Jouets", description:"Jouets pour enfants de tous âges" },
  { name: "Livres", description:"Livres de tous genres" },
  { name: "Sport", description:"Équipements et vêtements de sport" },
  { name: "Automobile", description:"Véhicules et accessoires automobiles" },
  { name: "Immobilier", description:"Biens immobiliers et terrains" },
  { name: "Services", description:"Services divers" },
  { name: "Autres", description:"Catégories diverses" }
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
    const permission = await prisma.permission.findUnique({ where: { permissionKey: key } });
    if (permission) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: userRole.id, permissionId: permission.id } },
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
      where: { roleId_permissionId: { roleId: superAdminRole.id, permissionId: permission.id } },
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
        description: category.description
      },
    });
  }

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

  
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });