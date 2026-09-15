import type { PermissionCatalogGroup, PermissionKey } from "@gifftai/shared";
import { permissionsRepository } from "./permissions.repository";

export const permissionsService = {
  async listCatalog(): Promise<PermissionCatalogGroup[]> {
    const permissions = await permissionsRepository.list();

    const groups = new Map<string, PermissionCatalogGroup>();
    for (const permission of permissions) {
      const group = groups.get(permission.module) ?? { module: permission.module, permissions: [] };
      group.permissions.push({
        key: permission.key as PermissionKey,
        module: permission.module,
        action: permission.action,
        description: permission.description,
      });
      groups.set(permission.module, group);
    }

    return Array.from(groups.values());
  },
};
