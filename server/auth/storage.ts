import { users, type User } from "@shared/models/auth";
import { db } from "../db";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

export interface RegisterUser {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

class AuthStorage {
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async registerUser(userData: RegisterUser): Promise<User> {
    // Check if user already exists
    const existingUser = await this.getUserByEmail(userData.email);
    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

    // Insert new user with specified role or default to "user"
    const [user] = await db
      .insert(users)
      .values({
        email: userData.email,
        password: hashedPassword,
        firstName: userData.firstName || null,
        lastName: userData.lastName || null,
        role: userData.role || "user", // Use specified role or default to "user"
      })
      .returning();

    return user;
  }

  async verifyPassword(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user || !user.password) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return null;
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  }
}

export const authStorage = new AuthStorage();
