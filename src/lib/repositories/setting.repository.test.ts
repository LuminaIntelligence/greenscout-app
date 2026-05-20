import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => {
  const setting = {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
  };
  return { prisma: { setting } };
});

import { prisma } from "@/lib/db";

import { getSetting, listSettings, setSetting } from "./setting.repository";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("setting.repository", () => {
  it("getSetting looks up by key", async () => {
    await getSetting("smtp.host");
    expect(prisma.setting.findUnique).toHaveBeenCalledWith({
      where: { key: "smtp.host" },
    });
  });

  it("setSetting upserts the key/value pair", async () => {
    await setSetting("smtp.host", "smtp.example.com");
    expect(prisma.setting.upsert).toHaveBeenCalledWith({
      where: { key: "smtp.host" },
      create: { key: "smtp.host", value: "smtp.example.com" },
      update: { value: "smtp.example.com" },
    });
  });

  it("listSettings without prefix returns the full table sorted by key ASC", async () => {
    await listSettings();
    expect(prisma.setting.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { key: "asc" },
    });
  });

  it("listSettings with prefix filters via startsWith", async () => {
    await listSettings("smtp.");
    expect(prisma.setting.findMany).toHaveBeenCalledWith({
      where: { key: { startsWith: "smtp." } },
      orderBy: { key: "asc" },
    });
  });
});
