import { NextFunction, Request, Response } from "express";
import { env } from "../config/env";

const rolePermissions: Record<string, string[]> = {
  Admin: ["full", "read", "collect", "investigate", "analyze", "export", "audit", "manage_cases"],
  Analyst: ["read", "investigate", "analyze", "export"],
  Investigator: ["read", "collect", "investigate"],
  Viewer: ["read"]
};

function currentRole(req: Request): string {
  const headerRole = req.header("X-ReconVault-Role");
  if (headerRole) return headerRole;
  return env.nodeEnv === "production" ? "Viewer" : "Admin";
}

export class RbacService {
  getDefaultRoles() {
    return Object.entries(rolePermissions).map(([name, permissions]) => ({ name, permissions }));
  }

  requireRole(...roles: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      const role = currentRole(req);
      if (roles.length === 0 || roles.includes(role) || role === "Admin") return next();
      return res.status(403).json({ status: "error", error: "Required role missing", requiredRoles: roles });
    };
  }

  requirePermission(permission: string) {
    return (req: Request, res: Response, next: NextFunction) => {
      const role = currentRole(req);
      const permissions = rolePermissions[role] || [];
      if (permissions.includes("full") || permissions.includes(permission)) return next();
      return res.status(403).json({ status: "error", error: "Required permission missing", permission });
    };
  }
}

export const rbacService = new RbacService();
export const requireRole = (...roles: string[]) => rbacService.requireRole(...roles);
export const requirePermission = (permission: string) => rbacService.requirePermission(permission);
