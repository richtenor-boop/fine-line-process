"use client";

import { useState, useTransition } from "react";
import { toggleRolePermissionAction } from "./actions";
import type { PermissionKey } from "@/lib/rbac/permissions";

interface RoleRow {
  id: string;
  name: string;
  grantedKeys: Set<string>;
}

export function PermissionMatrix({
  roles,
  permissions,
}: {
  roles: RoleRow[];
  permissions: { key: string; description: string }[];
}) {
  const [, startTransition] = useTransition();
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  function isGranted(roleId: string, key: string) {
    const cellKey = `${roleId}:${key}`;
    if (cellKey in overrides) return overrides[cellKey];
    return roles.find((r) => r.id === roleId)?.grantedKeys.has(key) ?? false;
  }

  function toggle(roleId: string, key: string) {
    const next = !isGranted(roleId, key);
    setOverrides((prev) => ({ ...prev, [`${roleId}:${key}`]: next }));
    startTransition(async () => {
      await toggleRolePermissionAction(roleId, key as PermissionKey, next);
    });
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-sm">
        <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="sticky left-0 bg-surface px-4 py-2 font-medium">Permission</th>
            {roles.map((role) => (
              <th key={role.id} className="px-2 py-2 text-center font-medium">
                {role.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {permissions.map((permission) => (
            <tr key={permission.key} className="border-b border-border last:border-0">
              <td className="sticky left-0 bg-surface px-4 py-2 text-foreground">
                <p className="font-medium">{permission.key}</p>
                <p className="text-xs text-muted">{permission.description}</p>
              </td>
              {roles.map((role) => (
                <td key={role.id} className="px-2 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={isGranted(role.id, permission.key)}
                    onChange={() => toggle(role.id, permission.key)}
                    disabled={role.name === "Owner"}
                    className="h-4 w-4 accent-primary"
                    title={role.name === "Owner" ? "Owner always has full access" : undefined}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
