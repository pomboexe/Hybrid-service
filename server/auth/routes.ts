import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./auth";

// Register auth-specific routes
export function registerAuthRoutes(app: Express): void {
  // Get current authenticated user
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const user = await authStorage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Register endpoint
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName, role } = req.body;

      console.log("Registration request body:", {
        email,
        role,
        roleType: typeof role,
      });

      if (!email || !password) {
        return res
          .status(400)
          .json({ message: "Email and password are required" });
      }

      if (password.length < 6) {
        return res
          .status(400)
          .json({ message: "Password must be at least 6 characters" });
      }

      // Validate role - only allow "user" or "admin"
      const validRole = role === "admin" ? "admin" : "user";
      console.log("Validated role:", validRole);

      const user = await authStorage.registerUser({
        email: email.toLowerCase().trim(),
        password,
        firstName,
        lastName,
        role: validRole,
      });

      // Set session
      (req.session as any).userId = user.id;

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json({
        user: userWithoutPassword,
        message: "Registered successfully",
      });
    } catch (error: any) {
      console.error("Error registering user:", error);
      if (error.message === "User with this email already exists") {
        return res.status(409).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to register user" });
    }
  });

  // Login endpoint
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .json({ message: "Email and password are required" });
      }

      const user = await authStorage.verifyPassword(
        email.toLowerCase().trim(),
        password
      );

      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Set session
      (req.session as any).userId = user.id;

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      res.json({
        user: userWithoutPassword,
        message: "Logged in successfully",
      });
    } catch (error) {
      console.error("Error logging in:", error);
      res.status(500).json({ message: "Failed to login" });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });
}
