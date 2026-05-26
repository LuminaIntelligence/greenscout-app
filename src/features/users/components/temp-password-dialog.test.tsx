import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

import { TempPasswordDialog } from "./temp-password-dialog";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("TempPasswordDialog", () => {
  it("renders the temp password value", () => {
    render(<TempPasswordDialog open tempPassword="temp-pw-stub" onClose={() => undefined} />);
    expect(screen.getByTestId("temp-password-value")).toHaveTextContent("temp-pw-stub");
  });

  it("renders the German title + description", () => {
    render(<TempPasswordDialog open tempPassword="abc" onClose={() => undefined} />);
    expect(screen.getByText("Temporäres Passwort")).toBeInTheDocument();
    expect(screen.getByText(/Dieses Passwort wird genau einmal angezeigt/)).toBeInTheDocument();
  });

  it("invokes onClose when the close button is clicked", () => {
    const onClose = vi.fn();
    render(<TempPasswordDialog open tempPassword="abc" onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /Schließen/ }));
    expect(onClose).toHaveBeenCalled();
  });

  it("invokes the clipboard API when Copy is clicked", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    render(<TempPasswordDialog open tempPassword="copy-test" onClose={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: /In Zwischenablage kopieren/ }));
    // The mock returns a resolved promise; wait one microtask + verify
    await Promise.resolve();
    expect(writeText).toHaveBeenCalledWith("copy-test");
  });

  it("does not crash if the clipboard write throws", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    render(<TempPasswordDialog open tempPassword="abc" onClose={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: /In Zwischenablage kopieren/ }));
    await Promise.resolve();
    await Promise.resolve();
    expect(writeText).toHaveBeenCalled();
  });
});
