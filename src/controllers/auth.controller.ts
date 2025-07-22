import { Request, Response } from "express";
import ResponseApi from "../helper/response.js";
import prisma from "../model/prisma.client.js";
import { comparePassword, hashPassword } from "../utilities/bcrypt.js";
import { generateToken } from "../utilities/token.js";
interface Register {
  email: string;
  password: string;
  name: string;
}

export const register = async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, password, name }: Register = req.body;
    // verifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      return ResponseApi.error(res, "User already exists", null, 500);
    }

    const hashPassord = await hashPassword(password);

    // créer un nouvel utilisateur
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashPassord,
        name: name,
      },
    });

    //generer un token de verification
    const token = generateToken({
      id: newUser.id,
      email: newUser.email,
    });

    // on retire le mot de passe de la réponse
    const { password: _, ...userWithoutPassword } = newUser;

    ResponseApi.success(
      res,
      "User registered successfully",
      { user: userWithoutPassword, token },
      201
    );
  } catch (error) {
    console.error("Error in register:", error);
    ResponseApi.error(res, "An error occurred during registration", 500);
  }
};

export const login = async (req: Request, res: Response): Promise<any> => {
    try {
        const { email, password } = req.body;
        // Vérifier si l'utilisateur existe
        const user = await prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            return ResponseApi.error(res, "Invalid email or password", null, 401);
        }

        // Comparer le mot de passe
        const isPasswordValid = await comparePassword(password,user.password)
        if (!isPasswordValid) {
            return ResponseApi.error(res, "Invalid email or password", null, 401);
        }

        // Générer un token
        const token = generateToken({
            id: user.id,
            email: user.email,
        });
        // Retirer le mot de passe de la réponse
        const { password: _, ...userWithoutPassword } = user;
        ResponseApi.success(
            res,
            "Login successful",
            { user: userWithoutPassword, token },
            200
        );

    } catch (error) {
        console.error("Error in login:", error);
        ResponseApi.error(res, "An error occurred during login", 500);
    }
};
