import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * shadcn/ui Skeleton primitive — added in T-022 for the customer-table
 * loading state. Standard shadcn implementation: muted background with
 * a slow pulse animation (`animate-pulse` ships with Tailwind core).
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

export { Skeleton };
