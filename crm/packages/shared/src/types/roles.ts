import type { PermissionKey } from "../constants/permissions.js";

export interface RoleSummary {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissionCount: number;
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface RoleDetail extends RoleSummary {
  permissions: PermissionKey[];
}

export interface PermissionCatalogItem {
  key: PermissionKey;
  module: string;
  action: string;
  description: string | null;
}

export interface PermissionCatalogGroup {
  module: string;
  permissions: PermissionCatalogItem[];
}
