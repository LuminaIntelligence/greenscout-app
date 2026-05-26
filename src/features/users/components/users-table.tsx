"use client";

/**
 * T-041a UsersTable — client component rendering the admin user list.
 *
 * NOTE: This file uses `useReactTable()` from TanStack Table v8.
 * TanStack Table's API returns functions that the React Compiler
 * cannot memoize safely, which trips ESLint's
 * `react-hooks/incompatible-library` rule. The same scoped override
 * documented in `customer-table.tsx` applies here
 * (`src/features/<feature>/components/<name>-table.tsx`).
 *
 * Unlike `customer-table.tsx`, the users dashboard is rendered as a
 * single page (no server-side pagination yet — we expect ≤ 50 users
 * per org in MVP). All data is passed in via `initialData`; filters
 * are applied client-side. If the org grows past the default
 * `MAX_TAKE = 200` from the repository, a follow-up task can promote
 * this to the server-side-paginated pattern from `customer-table`.
 */

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { Pencil } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserDeactivateDialog } from "@/features/users/components/user-deactivate-dialog";
import { t } from "@/i18n/de";

export interface UserRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "ADMIN" | "BERATER";
  active: boolean;
  createdAt: string; // ISO string — Date is not serialisable across the RSC boundary
  isSelf: boolean;
}

export interface UsersTableProps {
  initialData: UserRow[];
}

const SHARED_SELECT_CLASSES =
  "border-input bg-background ring-offset-background focus-visible:ring-ring h-10 rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function UsersTable({ initialData }: UsersTableProps) {
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [stateFilter, setStateFilter] = useState<string>(""); // "" | "active" | "inactive"
  const [search, setSearch] = useState<string>("");

  const data = useMemo(() => {
    const lowered = search.trim().toLowerCase();
    return initialData.filter((u) => {
      if (roleFilter && u.role !== roleFilter) return false;
      if (stateFilter === "active" && !u.active) return false;
      if (stateFilter === "inactive" && u.active) return false;
      if (lowered.length > 0) {
        const haystack = `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase();
        if (!haystack.includes(lowered)) return false;
      }
      return true;
    });
  }, [initialData, roleFilter, stateFilter, search]);

  const columns = useMemo<ColumnDef<UserRow>[]>(
    () => [
      {
        id: "name",
        header: () => t("users.column.name"),
        accessorFn: (row) => `${row.firstName} ${row.lastName}`,
        cell: ({ row }) => {
          const u = row.original;
          return `${u.firstName} ${u.lastName}`.trim() || "—";
        },
      },
      {
        id: "email",
        header: () => t("users.column.email"),
        accessorKey: "email",
      },
      {
        id: "role",
        header: () => t("users.column.role"),
        accessorKey: "role",
        cell: ({ row }) => (
          <Badge variant={row.original.role === "ADMIN" ? "default" : "secondary"}>
            {row.original.role === "ADMIN" ? t("users.role.admin") : t("users.role.berater")}
          </Badge>
        ),
      },
      {
        id: "active",
        header: () => t("users.column.active"),
        accessorKey: "active",
        cell: ({ row }) =>
          row.original.active ? (
            <Badge variant="outline">{t("users.state.active")}</Badge>
          ) : (
            <Badge variant="destructive">{t("users.state.inactive")}</Badge>
          ),
      },
      {
        id: "createdAt",
        header: () => t("users.column.created"),
        accessorKey: "createdAt",
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
      {
        id: "actions",
        header: () => t("users.column.actions"),
        cell: ({ row }) => {
          const u = row.original;
          return (
            <div className="flex items-center justify-end gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link href={`/users/${u.id}/edit`}>
                  <Pencil className="size-4" />
                  {t("users.action.edit")}
                </Link>
              </Button>
              {u.active && !u.isSelf && (
                <UserDeactivateDialog
                  userId={u.id}
                  userDisplayName={`${u.firstName} ${u.lastName}`.trim() || u.email}
                />
              )}
            </div>
          );
        },
      },
    ],
    [],
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="search"
          placeholder={t("users.column.email")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          aria-label={t("users.column.role")}
          className={SHARED_SELECT_CLASSES}
        >
          <option value="">{t("users.filter.all-roles")}</option>
          <option value="ADMIN">{t("users.role.admin")}</option>
          <option value="BERATER">{t("users.role.berater")}</option>
        </select>
        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          aria-label={t("users.column.active")}
          className={SHARED_SELECT_CLASSES}
        >
          <option value="">{t("users.filter.all-states")}</option>
          <option value="active">{t("users.state.active")}</option>
          <option value="inactive">{t("users.state.inactive")}</option>
        </select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-muted-foreground">
                  {t("users.empty.no-users")}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
