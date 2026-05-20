import { describe, it, expect } from "vitest";

import type { PrismaTransaction } from "./transaction";

describe("PrismaTransaction type", () => {
  it("exposes the standard delegate properties for repository writes", () => {
    // Compile-time assertion only — the alias must resolve to a type
    // that includes the seven repository-targeted model delegates. If
    // Prisma renames `TransactionClient` in a future major, this test
    // catches it at typecheck time.
    type Assertion = Pick<
      PrismaTransaction,
      "user" | "customer" | "study" | "studyImage" | "generatedDocument" | "auditLog" | "setting"
    >;
    const sentinel: Assertion | null = null;
    expect(sentinel).toBeNull();
  });
});
