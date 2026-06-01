import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { makeFixtureStudyDocumentData } from "./__fixtures__/study-document-data.fixture";
import { StudyDocument } from "./document";

describe("StudyDocument", () => {
  it("renders all 19 slides in order", () => {
    const data = makeFixtureStudyDocumentData();
    const { container } = render(<StudyDocument data={data} />);
    const sections = container.querySelectorAll("[data-slide-number]");
    expect(sections.length).toBe(19);
    for (let i = 0; i < 19; i++) {
      expect(sections[i].getAttribute("data-slide-number")).toBe(String(i + 1));
    }
  });
});
