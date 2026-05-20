import { describe, it, expect } from "vitest";

import { withOrg } from "./with-org";

describe("withOrg", () => {
  it("forwards the organizationId to the callback", () => {
    const result = withOrg("test-org", (id) => `received:${id}`);
    expect(result).toBe("received:test-org");
  });

  it("returns the callback's return value verbatim", () => {
    const out = withOrg("any", () => ({ ok: true }));
    expect(out).toEqual({ ok: true });
  });

  it("passes the literal organizationId value through unchanged", () => {
    const received: string[] = [];
    withOrg("greenscout", (id) => {
      received.push(id);
    });
    expect(received).toEqual(["greenscout"]);
  });
});
