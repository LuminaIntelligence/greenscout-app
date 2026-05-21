"use client";

/**
 * T-022 customer list client component.
 *
 * NOTE: This file uses `useReactTable()` from TanStack Table v8.
 * TanStack Table's API returns functions that the React Compiler cannot
 * memoize safely, which trips ESLint's
 * `react-hooks/incompatible-library` rule. A scoped override in
 * `eslint.config.mjs` disables that rule (warning-level) for files
 * matching `src/features/**\/components/**\/*-table.tsx`, the
 * established pattern for tables that consume `useReactTable`.
 *
 * Renders a TanStack-Table-driven view of customers with:
 *
 *   - debounced search input (300ms, no extra deps)
 *   - URL-state in `?page=N&search=...` so refresh + share-link work
 *   - TanStack Query for fetch lifecycle (initialData hydrates from the
 *     Server Component's pre-fetched first page)
 *   - skeleton loading rows during background refetches
 *   - disabled placeholder actions for "Anzeigen"/"Bearbeiten" until
 *     T-023 / T-024 land
 *   - empty state differentiated for "no customers ever" vs.
 *     "search yielded nothing"
 *
 * @see DECISIONS.md → "T-022 silent decisions per §14 (consolidated)"
 */

import { useQuery } from "@tanstack/react-query";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { Eye, MoreHorizontal, Pencil } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { t } from "@/i18n/de";

export const PAGE_SIZE = 25;

export interface CustomerRow {
  id: string;
  companyName: string | null;
  contactFirstName: string;
  contactLastName: string;
  billingCity: string | null;
  studyCount: number;
}

export interface CustomerListResult {
  customers: CustomerRow[];
  total: number;
}

interface CustomerTableProps {
  initialData: CustomerListResult;
  initialPage: number;
  initialSearch: string;
}

async function fetchCustomers(page: number, search: string): Promise<CustomerListResult> {
  const params = new URLSearchParams();
  params.set("page", String(page));
  if (search) params.set("search", search);
  const response = await fetch(`/api/customers?${params.toString()}`);
  if (!response.ok) throw new Error("Failed to fetch customers");
  return (await response.json()) as CustomerListResult;
}

export function CustomerTable({ initialData, initialPage, initialSearch }: CustomerTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));

  // Debounce the live search input (no library — single inline timer).
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchValue), 300);
    return () => clearTimeout(handle);
  }, [searchValue]);

  // When debouncedSearch changes, sync into the URL and reset page to 1.
  useEffect(() => {
    if (debouncedSearch === (searchParams.get("search") ?? "")) return;
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedSearch) params.set("search", debouncedSearch);
    else params.delete("search");
    params.delete("page");
    router.replace(`/customers?${params.toString()}`);
  }, [debouncedSearch, router, searchParams]);

  const { data, isLoading } = useQuery<CustomerListResult>({
    queryKey: ["customers", page, debouncedSearch],
    queryFn: () => fetchCustomers(page, debouncedSearch),
    initialData:
      page === initialPage && debouncedSearch === initialSearch ? initialData : undefined,
  });

  const columns = useMemo<ColumnDef<CustomerRow>[]>(
    () => [
      {
        accessorKey: "companyName",
        header: t("customers.column.company"),
        cell: ({ row }) => row.original.companyName ?? "—",
      },
      {
        id: "contactName",
        header: t("customers.column.contact"),
        cell: ({ row }) => `${row.original.contactFirstName} ${row.original.contactLastName}`,
      },
      {
        accessorKey: "billingCity",
        header: t("customers.column.city"),
        cell: ({ row }) => row.original.billingCity ?? "—",
      },
      {
        accessorKey: "studyCount",
        header: t("customers.column.studies"),
        cell: ({ row }) => <span className="tabular-nums">{row.original.studyCount}</span>,
      },
      {
        id: "actions",
        header: "",
        cell: () => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" aria-label="Aktionen">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled aria-disabled="true">
                <Eye className="mr-2 size-4" />
                {t("customers.action.view")} ({t("customers.action.pending-t024")})
              </DropdownMenuItem>
              <DropdownMenuItem disabled aria-disabled="true">
                <Pencil className="mr-2 size-4" />
                {t("customers.action.edit")} ({t("customers.action.pending-t023")})
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: data?.customers ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const showingFrom = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(page * PAGE_SIZE, total);

  function goToPage(newPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`/customers?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <Input
        type="search"
        placeholder={t("customers.search.placeholder")}
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        aria-label={t("customers.search.placeholder")}
        className="max-w-sm"
      />

      <Card className="overflow-hidden">
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
            {isLoading ? (
              Array.from({ length: 5 }).map((_, rowIndex) => (
                <TableRow key={`skel-${rowIndex}`}>
                  {columns.map((_col, colIndex) => (
                    <TableCell key={`skel-${rowIndex}-${colIndex}`}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-muted-foreground"
                >
                  {debouncedSearch
                    ? t("customers.empty.no-results")
                    : t("customers.empty.no-customers")}
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

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t("customers.pagination.summary")
            .replace("{from}", String(showingFrom))
            .replace("{to}", String(showingTo))
            .replace("{total}", String(total))}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => goToPage(page - 1)}
          >
            {t("customers.pagination.previous")}
          </Button>
          <span className="text-sm tabular-nums">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => goToPage(page + 1)}
          >
            {t("customers.pagination.next")}
          </Button>
        </div>
      </div>
    </div>
  );
}
