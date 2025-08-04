var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import prisma from "../model/prisma.client.js";
import { hashPassword } from "../utilities/bcrypt.js";
const PERMISSIONS = [
    "USER_CREATE", "USER_GET_ALL", "USER_GET_BY_ID", "USER_UPDATE", "USER_DELETE",
    "ROLE_GET_ALL", "ROLE_GET_BY_ID", "ROLE_CREATE", "ROLE_UPDATE", "ROLE_DELETE", "ROLE_ASSIGN",
    "PRODUCT_REVIEW", "PRODUCT_PREVIEW", "PRODUCT_CREATE", "PRODUCT_UPDATE", "PRODUCT_DELETE",
    "PERMISSION_READ", "PERMISSION_CREATE", "PERMISSION_UPDATE", "PERMISSION_DELETE", "PERMISSION_ASSIGN",
    "CITY_CREATE", "CITY_UPDATE", "CITY_DELETE",
    "CATEGORY_CREATE", "CATEGORY_UPDATE", "CATEGORY_DELETE"
];
const USER_PERMISSIONS = ["PRODUCT_CREATE", "PRODUCT_UPDATE", "PRODUCT_DELETE"];
+function seed() {
    return __awaiter(this, void 0, void 0, function* () {
        // 1. Créer toutes les permissions si elles n'existent pas
        for (const key of PERMISSIONS) {
            yield prisma.permission.upsert({
                where: { permissionKey: key },
                update: {},
                create: {
                    permissionKey: key,
                    title: key.replace(/_/g, " "),
                    description: `Permission for ${key}`,
                },
            });
        }
        // 2. Créer le rôle USER s'il n'existe pas
        const userRole = yield prisma.role.upsert({
            where: { name: "USER" },
            update: {},
            create: {
                name: "USER",
                description: "Utilisateur standard",
            },
        });
        // 3. Assigner les permissions USER_PERMISSIONS au rôle USER
        for (const key of USER_PERMISSIONS) {
            const permission = yield prisma.permission.findUnique({ where: { permissionKey: key } });
            if (permission) {
                yield prisma.rolePermission.upsert({
                    where: { roleId_permissionId: { roleId: userRole.id, permissionId: permission.id } },
                    update: {},
                    create: { roleId: userRole.id, permissionId: permission.id },
                });
            }
        }
        // 4. Créer le rôle SUPER_ADMIN s'il n'existe pas
        const superAdminRole = yield prisma.role.upsert({
            where: { name: "SUPER_ADMIN" },
            update: {},
            create: {
                name: "SUPER_ADMIN",
                description: "Super administrateur",
            },
        });
        // 5. Créer l'utilisateur SUPER_ADMIN s'il n'existe pas
        const superAdminEmail = "tsefackcalvinklein@gmail.com";
        const superAdmin = yield prisma.user.upsert({
            where: { email: superAdminEmail },
            update: {},
            create: {
                firstName: "super admin",
                lastName: "BuyamSale",
                email: superAdminEmail,
                password: yield hashPassword("BuyamSale"),
                isVerified: true,
                phone: "B",
                status: "ACTIVE",
            },
        });
        // 6. Assigner le rôle SUPER_ADMIN à l'utilisateur
        yield prisma.userRole.upsert({
            where: { userId_roleId: { userId: superAdmin.id, roleId: superAdminRole.id } },
            update: {},
            create: { userId: superAdmin.id, roleId: superAdminRole.id },
        });
        // 7. Assigner toutes les permissions au rôle SUPER_ADMIN
        const allPermissions = yield prisma.permission.findMany();
        for (const permission of allPermissions) {
            yield prisma.rolePermission.upsert({
                where: { roleId_permissionId: { roleId: superAdminRole.id, permissionId: permission.id } },
                update: {},
                create: { roleId: superAdminRole.id, permissionId: permission.id },
            });
        }
        console.log("Seed completed!");
    });
};
seed().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
