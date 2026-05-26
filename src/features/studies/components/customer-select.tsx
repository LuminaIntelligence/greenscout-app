"use client";

/**
 * T-026a CustomerSelect — Step 1 client component.
 *
 * Reuses the T-022 `/api/customers` JSON endpoint to populate a
 * shadcn `Select` of all customers in the current org. The picker
 * shows `companyName` + `(Vor- Nachname)` fallback so private
 * persons (no company) are still labelled meaningfully.
 *
 * The component is *uncontrolled-on-RHF* — it takes the current
 * `customerId` + an `onChange` and updates via `Select`'s
 * controlled API. Validation lives in the calling form (RHF +
 * step1KundeSchema).
 */

import { useQuery } from "@tanstack/react-query";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { t } from "@/i18n/de";

interface CustomerOption {
  id: string;
  companyName: string | null;
  contactFirstName: string;
  contactLastName: string;
}

interface CustomerListResponse {
  customers: CustomerOption[];
  total: number;
}

async function fetchCustomersForSelect(): Promise<CustomerOption[]> {
  // Page 1 with the server-side default 25 rows covers the MVP's
  // 1–10-consultant / small-customer-pool reality. A future
  // refactor will swap to a debounced search-driven combobox.
  const response = await fetch("/api/customers?page=1");
  if (!response.ok) throw new Error("Failed to fetch customers");
  const json = (await response.json()) as CustomerListResponse;
  return json.customers;
}

export interface CustomerSelectProps {
  value: string | undefined;
  onChange: (next: string) => void;
  disabled?: boolean;
}

export function CustomerSelect({ value, onChange, disabled }: CustomerSelectProps) {
  const { data, isLoading } = useQuery<CustomerOption[]>({
    queryKey: ["studies", "customer-select"],
    queryFn: fetchCustomersForSelect,
  });

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled || isLoading}>
      <SelectTrigger>
        <SelectValue placeholder={t("studies.field.customer.placeholder")} />
      </SelectTrigger>
      <SelectContent>
        {(data ?? []).map((customer) => {
          const label =
            customer.companyName ?? `${customer.contactFirstName} ${customer.contactLastName}`;
          return (
            <SelectItem key={customer.id} value={customer.id}>
              {label}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
