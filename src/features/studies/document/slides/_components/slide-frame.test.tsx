import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ImageSlot } from "./image-slot";
import { SlideFrame } from "./slide-frame";

describe("SlideFrame", () => {
  it("renders the slide number and total in the footer", () => {
    const { container } = render(
      <SlideFrame slideNumber={5} customerLabel="ACME">
        body
      </SlideFrame>,
    );
    const section = container.querySelector("section");
    expect(section?.getAttribute("data-slide-number")).toBe("5");
    expect(section?.getAttribute("data-slide-total")).toBe("19");
    expect(container.textContent).toContain("05 / 19");
    expect(container.textContent).toContain("ACME");
  });

  it("respects custom totalSlides", () => {
    const { container } = render(
      <SlideFrame slideNumber={3} totalSlides={5}>
        x
      </SlideFrame>,
    );
    expect(container.textContent).toContain("03 / 5");
  });

  it("hides footer when showFooter is false", () => {
    const { container } = render(
      <SlideFrame slideNumber={1} showFooter={false}>
        x
      </SlideFrame>,
    );
    expect(container.querySelector("footer")).toBeNull();
  });

  it("does not prefix customer label when null", () => {
    const { container } = render(
      <SlideFrame slideNumber={2} customerLabel={null}>
        x
      </SlideFrame>,
    );
    expect(container.textContent).toContain("Machbarkeitsstudie PV");
  });

  it("applies contentClassName to the inner wrapper", () => {
    const { container } = render(
      <SlideFrame slideNumber={2} contentClassName="custom-class">
        x
      </SlideFrame>,
    );
    expect(container.querySelector(".custom-class")).not.toBeNull();
  });
});

describe("ImageSlot", () => {
  it("renders the placeholder when src is null", () => {
    const { container } = render(<ImageSlot src={null} alt="x" emptyLabel="Empty here" />);
    expect(container.textContent).toContain("Empty here");
    expect(container.querySelector("img")).toBeNull();
  });

  it("renders an <img> when src is set", () => {
    const { container } = render(
      <ImageSlot src="/api/uploads/x" alt="Vorher" emptyLabel="empty" />,
    );
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("alt")).toBe("Vorher");
    expect(img?.getAttribute("src")).toBe("/api/uploads/x");
  });

  it("accepts a custom aspect ratio class", () => {
    const { container } = render(
      <ImageSlot src={null} alt="x" emptyLabel="e" aspectClassName="aspect-square" />,
    );
    expect(container.querySelector(".aspect-square")).not.toBeNull();
  });

  it("accepts an extra className", () => {
    const { container } = render(<ImageSlot src="/x" alt="a" emptyLabel="e" className="extra" />);
    expect(container.querySelector(".extra")).not.toBeNull();
  });
});
