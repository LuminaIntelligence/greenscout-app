/**
 * Tests for `user.repository.ts`. These rely on Vitest's `vi.mock()`
 * to substitute the Prisma singleton at `@/lib/db` with an in-memory
 * spy that records every call. The goal is to verify the repository
 * contract — `organizationId` filter, soft-delete filter, email
 * normalisation — not to exercise real SQL.
 *
 * The file is idle until T-018 installs Vitest. tsconfig already
 * excludes `**\/*.test.ts(x)`, so this does not affect builds.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => {
  const user = {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  return { prisma: { user } };
});

import { prisma } from "@/lib/db";

import {
  createUser,
  findUserByEmail,
  findUserById,
  hardDeleteUser,
  incrementFailedLoginCount,
  listUsers,
  resetFailedLoginCount,
  setLockoutUntil,
  setMustChangePassword,
  softDeleteUser,
  updatePasswordHash,
  updateUser,
} from "./user.repository";

const ORG = "greenscout";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("user.repository — organizationId filter", () => {
  it("findUserById applies organizationId to the where clause", async () => {
    await findUserById(ORG, "user-1");
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { id: "user-1", organizationId: ORG, deletedAt: null },
    });
  });

  it("listUsers applies organizationId to the where clause", async () => {
    await listUsers(ORG);
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: ORG }),
      }),
    );
  });

  it("createUser overrides any organizationId on the input data", async () => {
    await createUser(ORG, {
      email: "x@y.com",
      passwordHash: "h",
      firstName: "X",
      lastName: "Y",
      organizationId: "other-tenant",
    });
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ organizationId: ORG }),
    });
  });
});

describe("user.repository — soft-delete filter", () => {
  it("findUserById excludes soft-deleted rows by default", async () => {
    await findUserById(ORG, "user-1");
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { id: "user-1", organizationId: ORG, deletedAt: null },
    });
  });

  it("findUserById includes soft-deleted rows when opted in", async () => {
    await findUserById(ORG, "user-1", { includeDeleted: true });
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { id: "user-1", organizationId: ORG },
    });
  });

  it("listUsers excludes soft-deleted rows by default", async () => {
    await listUsers(ORG);
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ deletedAt: null }),
      }),
    );
  });

  it("softDeleteUser sets deletedAt", async () => {
    await softDeleteUser(ORG, "user-1");
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1", organizationId: ORG },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      }),
    );
  });
});

describe("user.repository — email normalisation", () => {
  it("findUserByEmail lowercases and trims the input", async () => {
    await findUserByEmail(ORG, "  Foo@BAR.com  ");
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { email: "foo@bar.com", organizationId: ORG, deletedAt: null },
    });
  });

  it("createUser lowercases and trims the email on the data payload", async () => {
    await createUser(ORG, {
      email: " ADMIN@Greenscout.de ",
      passwordHash: "h",
      firstName: "A",
      lastName: "B",
    });
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ email: "admin@greenscout.de" }),
    });
  });

  it("updateUser normalises a literal email patch", async () => {
    await updateUser(ORG, "user-1", { email: "  X@Y.COM  " });
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: "x@y.com" }),
      }),
    );
  });

  it("updateUser normalises a `set`-shape email patch", async () => {
    await updateUser(ORG, "user-1", { email: { set: " X@Y.COM " } });
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: { set: "x@y.com" } }),
      }),
    );
  });

  it("updateUser leaves the patch alone when email is not present", async () => {
    await updateUser(ORG, "user-1", { firstName: "Updated" });
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { firstName: "Updated" },
      }),
    );
  });
});

describe("user.repository — auth state helpers", () => {
  it("incrementFailedLoginCount uses Prisma increment", async () => {
    await incrementFailedLoginCount(ORG, "user-1");
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1", organizationId: ORG },
      data: { failedLoginCount: { increment: 1 } },
    });
  });

  it("resetFailedLoginCount sets the counter to zero", async () => {
    await resetFailedLoginCount(ORG, "user-1");
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1", organizationId: ORG },
      data: { failedLoginCount: 0 },
    });
  });

  it("setLockoutUntil writes the given timestamp", async () => {
    const until = new Date("2030-01-01T00:00:00Z");
    await setLockoutUntil(ORG, "user-1", until);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1", organizationId: ORG },
      data: { lockoutUntil: until },
    });
  });

  it("setMustChangePassword writes the flag", async () => {
    await setMustChangePassword(ORG, "user-1", true);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1", organizationId: ORG },
      data: { mustChangePassword: true },
    });
  });

  it("updatePasswordHash sets hash and stamps passwordChangedAt", async () => {
    await updatePasswordHash(ORG, "user-1", "new-hash");
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1", organizationId: ORG },
        data: expect.objectContaining({
          passwordHash: "new-hash",
          passwordChangedAt: expect.any(Date),
        }),
      }),
    );
  });
});

describe("user.repository — hard delete", () => {
  it("hardDeleteUser scopes the delete to organizationId", async () => {
    await hardDeleteUser(ORG, "user-1");
    expect(prisma.user.delete).toHaveBeenCalledWith({
      where: { id: "user-1", organizationId: ORG },
    });
  });
});
