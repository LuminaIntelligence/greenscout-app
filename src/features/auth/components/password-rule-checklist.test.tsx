/**
 * T-019 PasswordRuleChecklist — Vitest + RTL unit tests.
 *
 * Three-state behaviour (DECISIONS T-019 contract):
 *   - Neutral (hasTyped=false): all 5 rules show Circle + muted labels +
 *     sr-only "noch nicht geprüft".
 *   - Passed (hasTyped=true && rule.test(value)): Check + plant-green
 *     icon + foreground label + sr-only "erfüllt".
 *   - Not-passed (hasTyped=true && !rule.test(value)): X + destructive
 *     icon + destructive label + sr-only "nicht erfüllt".
 *
 * 100% coverage gate per DECISIONS T-019 Vitest per-pattern thresholds.
 */

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PasswordRuleChecklist } from "./password-rule-checklist";

const RULE_LABELS: Record<string, string> = {
  "min-length": "Mindestens 8 Zeichen",
  upper: "Mindestens ein Großbuchstabe",
  lower: "Mindestens ein Kleinbuchstabe",
  digit: "Mindestens eine Ziffer",
  special: "Mindestens ein Sonderzeichen",
};

describe("PasswordRuleChecklist — neutral state (hasTyped=false)", () => {
  it("renders all 5 rule labels in German", () => {
    render(<PasswordRuleChecklist value="" hasTyped={false} />);
    Object.values(RULE_LABELS).forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it("announces 'noch nicht geprüft' for every rule (sr-only state)", () => {
    render(<PasswordRuleChecklist value="" hasTyped={false} />);
    const neutralAnnouncements = screen.getAllByText("noch nicht geprüft");
    expect(neutralAnnouncements).toHaveLength(5);
  });

  it("uses muted-foreground colour on every label in neutral state", () => {
    render(<PasswordRuleChecklist value="" hasTyped={false} />);
    Object.values(RULE_LABELS).forEach((label) => {
      const labelSpan = screen.getByText(label);
      expect(labelSpan).toHaveClass("text-muted-foreground");
    });
  });

  it("never announces 'erfüllt' or 'nicht erfüllt' in neutral state", () => {
    render(<PasswordRuleChecklist value="" hasTyped={false} />);
    expect(screen.queryByText("erfüllt")).not.toBeInTheDocument();
    expect(screen.queryByText("nicht erfüllt")).not.toBeInTheDocument();
  });

  it("ignores any non-empty value while hasTyped is still false (defensive)", () => {
    // Owner contract: hasTyped is set BEFORE the value lands. This guard
    // proves the component still renders neutral if a stale value is
    // passed without hasTyped flipping.
    render(<PasswordRuleChecklist value="Abc123!@#" hasTyped={false} />);
    expect(screen.getAllByText("noch nicht geprüft")).toHaveLength(5);
  });
});

describe("PasswordRuleChecklist — all-passed state (hasTyped=true)", () => {
  it("announces 'erfüllt' for every rule when value satisfies all five", () => {
    render(<PasswordRuleChecklist value="Abc12345!" hasTyped={true} />);
    const fulfilledAnnouncements = screen.getAllByText("erfüllt");
    expect(fulfilledAnnouncements).toHaveLength(5);
    expect(screen.queryByText("nicht erfüllt")).not.toBeInTheDocument();
    expect(screen.queryByText("noch nicht geprüft")).not.toBeInTheDocument();
  });

  it("uses foreground (not destructive) colour on every label when all rules pass", () => {
    render(<PasswordRuleChecklist value="Abc12345!" hasTyped={true} />);
    Object.values(RULE_LABELS).forEach((label) => {
      const labelSpan = screen.getByText(label);
      expect(labelSpan).toHaveClass("text-foreground");
      expect(labelSpan).not.toHaveClass("text-destructive");
    });
  });
});

describe("PasswordRuleChecklist — all-failed state (hasTyped=true)", () => {
  it("announces 'nicht erfüllt' for every rule when value is empty (after typing)", () => {
    // Sticky hasTyped: user typed then deleted. All rules now fail.
    render(<PasswordRuleChecklist value="" hasTyped={true} />);
    const failedAnnouncements = screen.getAllByText("nicht erfüllt");
    expect(failedAnnouncements).toHaveLength(5);
    expect(screen.queryByText("erfüllt")).not.toBeInTheDocument();
  });

  it("uses destructive colour on every label when all rules fail", () => {
    render(<PasswordRuleChecklist value="" hasTyped={true} />);
    Object.values(RULE_LABELS).forEach((label) => {
      expect(screen.getByText(label)).toHaveClass("text-destructive");
    });
  });
});

describe("PasswordRuleChecklist — mixed state (per-rule independence)", () => {
  it("value='abc' → only `lower` passes, the other 4 fail", () => {
    render(<PasswordRuleChecklist value="abc" hasTyped={true} />);
    expect(screen.getAllByText("erfüllt")).toHaveLength(1);
    expect(screen.getAllByText("nicht erfüllt")).toHaveLength(4);

    // `lower` rule label is in foreground (passed).
    expect(screen.getByText(RULE_LABELS.lower)).toHaveClass("text-foreground");
    // Others are destructive (not-passed).
    expect(screen.getByText(RULE_LABELS["min-length"])).toHaveClass("text-destructive");
    expect(screen.getByText(RULE_LABELS.upper)).toHaveClass("text-destructive");
    expect(screen.getByText(RULE_LABELS.digit)).toHaveClass("text-destructive");
    expect(screen.getByText(RULE_LABELS.special)).toHaveClass("text-destructive");
  });

  it("value='Ä' → only `upper` passes (Unicode-aware)", () => {
    // Unicode-aware: Ä is \p{Lu} and counts as upper. min-length still fails.
    render(<PasswordRuleChecklist value="Ä" hasTyped={true} />);
    expect(screen.getByText(RULE_LABELS.upper)).toHaveClass("text-foreground");
    expect(screen.getByText(RULE_LABELS["min-length"])).toHaveClass("text-destructive");
  });

  it("value='12345678' → `min-length` + `digit` pass, others fail", () => {
    render(<PasswordRuleChecklist value="12345678" hasTyped={true} />);
    expect(screen.getByText(RULE_LABELS["min-length"])).toHaveClass("text-foreground");
    expect(screen.getByText(RULE_LABELS.digit)).toHaveClass("text-foreground");
    expect(screen.getByText(RULE_LABELS.upper)).toHaveClass("text-destructive");
    expect(screen.getByText(RULE_LABELS.lower)).toHaveClass("text-destructive");
    expect(screen.getByText(RULE_LABELS.special)).toHaveClass("text-destructive");
  });

  it("value='Sonderzeichen!' → upper/lower/special pass, min-length passes, digit fails", () => {
    render(<PasswordRuleChecklist value="Sonderzeichen!" hasTyped={true} />);
    expect(screen.getByText(RULE_LABELS["min-length"])).toHaveClass("text-foreground");
    expect(screen.getByText(RULE_LABELS.upper)).toHaveClass("text-foreground");
    expect(screen.getByText(RULE_LABELS.lower)).toHaveClass("text-foreground");
    expect(screen.getByText(RULE_LABELS.special)).toHaveClass("text-foreground");
    expect(screen.getByText(RULE_LABELS.digit)).toHaveClass("text-destructive");
  });
});

describe("PasswordRuleChecklist — a11y container plumbing", () => {
  it("renders the container as role=list with aria-live=polite + German aria-label", () => {
    render(<PasswordRuleChecklist value="" hasTyped={false} />);
    const list = screen.getByRole("list");
    expect(list).toHaveAttribute("aria-live", "polite");
    expect(list).toHaveAttribute("aria-label", "Passwort-Anforderungen");
  });

  it("renders exactly 5 list items inside the container", () => {
    render(<PasswordRuleChecklist value="" hasTyped={false} />);
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(5);
  });

  it("each icon is aria-hidden (state lives in the sr-only span, not the glyph)", () => {
    const { container } = render(<PasswordRuleChecklist value="Abc12345!" hasTyped={true} />);
    const svgIcons = container.querySelectorAll("svg");
    expect(svgIcons).toHaveLength(5);
    svgIcons.forEach((svg) => {
      expect(svg.getAttribute("aria-hidden")).toBe("true");
    });
  });

  it("applies an optional className to the container in addition to the base styles", () => {
    render(<PasswordRuleChecklist value="" hasTyped={false} className="my-custom-test-class" />);
    const list = screen.getByRole("list");
    expect(list).toHaveClass("my-custom-test-class");
    expect(list).toHaveClass("rounded-md");
  });

  it("works without an explicit className (default styling applies)", () => {
    render(<PasswordRuleChecklist value="" hasTyped={false} />);
    const list = screen.getByRole("list");
    expect(list).toHaveClass("rounded-md");
  });
});
