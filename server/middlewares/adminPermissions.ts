import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { hasAdminPermission, type User, type AdminProfile } from "@shared/schema";

// Populated by requireAdmin for every /api/admin/* route, so
// requireAdminPermission (chained right after it) and the route handler
// itself can read the caller's admin identity without re-querying it.
declare global {
  namespace Express {
    interface Request {
      adminUser?: User;
      adminProfile?: AdminProfile;
    }
  }
}

// Coarse gate for every /api/admin/* route: must be an active admin
// account. Attaches adminUser/adminProfile to req.
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Authentification requise" });
  }

  const user = await storage.getUser(req.session.userId);
  if (!user || user.userType !== "admin") {
    return res.status(403).json({ message: "Accès administrateur requis" });
  }
  const profile = await storage.getAdminProfile(user.id);
  if (profile?.isActive === false) {
    return res.status(403).json({ message: "Ce compte administrateur a été désactivé" });
  }

  req.adminUser = user;
  req.adminProfile = profile;
  next();
}

// Fine-grained refinement, always chained after requireAdmin on the same
// route (see adminPermissions in shared/schema.ts — the single source of
// truth the client reads too, for hiding UI a level can't use):
// app.get(path, requireAdmin, requireAdminPermission("..."), handler).
export function requireAdminPermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!hasAdminPermission(req.adminProfile?.adminLevel, permission)) {
      return res.status(403).json({ message: `Permission "${permission}" requise` });
    }
    next();
  };
}
