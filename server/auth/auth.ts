import type { Express, RequestHandler } from "express";
import { getSession } from "./session";

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
}

// Authentication middleware
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const userId = (req.session as any)?.userId;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  return next();
};

// Admin middleware - requires authentication and admin role
export const isAdmin: RequestHandler = async (req, res, next) => {
  const userId = (req.session as any)?.userId;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  // Import here to avoid circular dependency
  const { authStorage } = await import("./storage");
  const user = await authStorage.getUserById(userId);
  
  if (!user || user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden: Admin access required" });
  }
  
  return next();
};
