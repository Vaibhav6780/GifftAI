import type { PermissionCatalogGroup, PermissionKey } from "@gifftai/shared";

interface RolePermissionPickerProps {
  groups: PermissionCatalogGroup[];
  selected: PermissionKey[];
  onChange: (next: PermissionKey[]) => void;
}

export function RolePermissionPicker({ groups, selected, onChange }: RolePermissionPickerProps) {
  const selectedSet = new Set(selected);

  function toggleOne(key: PermissionKey, checked: boolean) {
    onChange(checked ? [...selected, key] : selected.filter((k) => k !== key));
  }

  function toggleGroup(group: PermissionCatalogGroup, checked: boolean) {
    const keys = group.permissions.map((p) => p.key);
    onChange(
      checked
        ? Array.from(new Set([...selected, ...keys]))
        : selected.filter((k) => !keys.includes(k)),
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => {
        const groupKeys = group.permissions.map((p) => p.key);
        const allSelected = groupKeys.every((k) => selectedSet.has(k));

        return (
          <div key={group.module} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
            <label className="mb-2 flex items-center gap-2 text-sm font-medium capitalize text-slate-800 dark:text-slate-100">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => toggleGroup(group, e.target.checked)}
              />
              {group.module.replace(/_/g, " ")}
            </label>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pl-6 sm:grid-cols-4">
              {group.permissions.map((permission) => (
                <label key={permission.key} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={selectedSet.has(permission.key)}
                    onChange={(e) => toggleOne(permission.key, e.target.checked)}
                  />
                  {permission.action}
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
