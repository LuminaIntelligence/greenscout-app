"use client";

/**
 * T-028 studies dashboard client component. Mirrors the
 * `CustomerTable` pattern from T-022.
 *
 * Columns: object | customer | status badge | consultant | created
 *          | updated | actions menu (Anzeigen / Bearbeiten / Löschen).
 *
 * Filters: status (DRAFT/READY/GENERATED/all), consultant (admin
 * only — Berater filter is enforced server-side). URL state holds
 * page / status / consultantId for refresh + share-link safety.
 *
 * @see DECISIONS.md → "T-028 silent decisions per §14 (consolidated)"
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
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { t, type TranslationKey } from "@/i18n/de";

export const PAGE_SIZE = 25;

export interface StudyRow {
  id: string;
  objectName: string;
  customerLabel: string;
  consultantLabel: string | null;
  status: "DRAFT" | "READY" | "GENERATED";
  createdAt: string;
  updatedAt: string;
}

export interface StudyListResult {
  studies: StudyRow[];
  total: number;
}

interface StudiesTableProps {
  initialData: StudyListResult;
  initialPage: number;
  initialStatus: "" | "DRAFT" | "READY" | "GENERATED";
  showConsultantColumn: boolean;
}

async function fetchStudies(params: URLSearchParams): Promise<StudyListResult> {
  const response = await fetch(`/api/studies?${params.toString()}`);
  if (!response.ok) throw new Error("Failed to fetch studies");
  return (await response.json()) as StudyListResult;
}

function StatusBadge({ status }: { status: StudyRow["status"] }) {
  const labelKey: TranslationKey =
    status === "DRAFT"
      ? "studies.status.draft"
      : status === "READY"
        ? "studies.status.ready"
        : "studies.status.generated";
  const className =
    status === "DRAFT"
      ? "bg-muted text-foreground"
      : status === "READY"
        ? "bg-plant-green text-white"
        : "bg-forest-green text-white";
  return <Badge className={className}>{t(labelKey)}</Badge>;
}

function formatGermanDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

export function StudiesTable({
  initialData,
  initialPage,
  initialStatus,
  showConsultantColumn,
}: StudiesTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const status = (searchParams.get("status") ?? "") as "" | "DRAFT" | "READY" | "GENERATED";

  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    p.set("page", String(page));
    if (status) p.set("status", status);
    return p;
  }, [page, status]);

  const { data, isLoading } = useQuery<StudyListResult>({
    queryKey: ["studies", page, status],
    queryFn: () => fetchStudies(queryParams),
    initialData: page === initialPage && status === initialStatus ? initialData : undefined,
  });

  const columns = useMemo<ColumnDef<StudyRow>[]>(
    () => [
      {
        accessorKey: "objectName",
        header: t("studies.column.object"),
        cell: ({ row }) => (
          <Link href={`/studies/${row.original.id}`} className="text-link hover:underline">
            {row.original.objectName || "—"}
          </Link>
        ),
      },
      {
        accessorKey: "customerLabel",
        header: t("studies.column.customer"),
      },
      {
        accessorKey: "status",
        header: t("studies.column.status"),
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      ...(showConsultantColumn
        ? [
            {
              accessorKey: "consultantLabel",
              header: t("studies.column.consultant"),
            } as ColumnDef<StudyRow>,
          ]
        : []),
      {
        accessorKey: "createdAt",
        header: t("studies.column.created"),
        cell: ({ row }) => formatGermanDate(row.original.createdAt),
      },
      {
        accessorKey: "updatedAt",
        header: t("studies.column.updated"),
        cell: ({ row }) => formatGermanDate(row.original.updatedAt),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" aria-label="Aktionen">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/studies/${row.original.id}`}>
                  <Eye className="mr-2 size-4" />
                  {t("studies.action.view")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/studies/${row.original.id}/edit`}>
                  <Pencil className="mr-2 size-4" />
                  {t("studies.action.edit")}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [showConsultantColumn],
  );

  const table = useReactTable({
    data: data?.studies ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const showingFrom = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(page * PAGE_SIZE, total);

  function navigateTo(nextParams: URLSearchParams) {
    router.push(`/studies?${nextParams.toString()}`);
  }
  function goToPage(newPage: number) {
    const p = new URLSearchParams(searchParams.toString());
    p.set("page", String(newPage));
    navigateTo(p);
  }
  function setStatusFilter(newStatus: string) {
    const p = new URLSearchParams(searchParams.toString());
    if (newStatus) p.set("status", newStatus);
    else p.delete("status");
    p.delete("page");
    navigateTo(p);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm">
          <span className="mr-2 text-muted-foreground">{t("studies.column.status")}:</span>
          <select
            className="border-muted-foreground/30 rounded border bg-background px-2 py-1 text-sm"
            value={status}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label={t("studies.filter.placeholder.status")}
          >
            <option value="">{t("studies.filter.all-statuses")}</option>
            <option value="DRAFT">{t("studies.status.draft")}</option>
            <option value="READY">{t("studies.status.ready")}</option>
            <option value="GENERATED">{t("studies.status.generated")}</option>
          </select>
        </label>
      </div>

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
                  {status ? t("studies.empty.no-results") : t("studies.empty.no-studies")}
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
          {t("studies.pagination.summary")
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
            {t("studies.pagination.previous")}
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
            {t("studies.pagination.next")}
          </Button>
        </div>
      </div>
    </div>
  );
}
