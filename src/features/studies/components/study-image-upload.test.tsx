/**
 * T-029a — Tests for the StudyImageUpload widget.
 *
 * Drives the component with `@testing-library/user-event` against a
 * mocked `uploadStudyImageAction` Server Action (post-hotfix). The
 * DataTransfer / drag-events are dispatched manually because
 * `user-event` does not yet expose a drag-drop API.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/features/studies/actions/upload-study-image", () => ({
  uploadStudyImageAction: vi.fn(),
}));

import { uploadStudyImageAction } from "@/features/studies/actions/upload-study-image";

import { StudyImageUpload, type UploadedImageInfo } from "./study-image-upload";

const mockedAction = vi.mocked(uploadStudyImageAction);

function makeFile(
  name = "photo.jpg",
  type = "image/jpeg",
  bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
): File {
  return new File([bytes], name, { type });
}

function makeUploaded(over?: Partial<UploadedImageInfo>): UploadedImageInfo {
  return {
    id: "img-1",
    kind: "BEFORE",
    url: "/api/uploads/img-1",
    widthPx: 800,
    heightPx: 600,
    mimeType: "image/jpeg",
    ...over,
  };
}

function actionOk(image: UploadedImageInfo) {
  return {
    ok: true as const,
    image: {
      ...image,
      fileSizeBytes: 12345,
      wasReplacement: false,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("StudyImageUpload — empty slot", () => {
  it("renders the drag-drop prompt for the BEFORE slot", () => {
    render(
      <StudyImageUpload studyId="s1" kind="BEFORE" currentImage={null} onUploaded={vi.fn()} />,
    );
    expect(screen.getByText(/dach ohne pv/i)).toBeInTheDocument();
    expect(screen.getByText(/datei hier ablegen oder klicken/i)).toBeInTheDocument();
  });

  it("renders the drag-drop prompt for the AFTER slot", () => {
    render(<StudyImageUpload studyId="s1" kind="AFTER" currentImage={null} onUploaded={vi.fn()} />);
    expect(screen.getByText(/dach mit pv/i)).toBeInTheDocument();
  });

  it("triggers the file picker when the dropzone is clicked", async () => {
    const user = userEvent.setup();
    render(
      <StudyImageUpload studyId="s1" kind="BEFORE" currentImage={null} onUploaded={vi.fn()} />,
    );
    const input = screen.getByTestId("upload-file-input-before") as HTMLInputElement;
    const clickSpy = vi.spyOn(input, "click");
    const dropzone = screen.getByTestId("upload-dropzone-before");
    await user.click(dropzone);
    expect(clickSpy).toHaveBeenCalled();
  });

  it("disables interaction when `disabled` prop is true", async () => {
    const user = userEvent.setup();
    render(
      <StudyImageUpload
        studyId="s1"
        kind="BEFORE"
        currentImage={null}
        onUploaded={vi.fn()}
        disabled
      />,
    );
    const dropzone = screen.getByTestId("upload-dropzone-before") as HTMLButtonElement;
    expect(dropzone).toBeDisabled();
    // Clicking a disabled button should not open the picker.
    const input = screen.getByTestId("upload-file-input-before") as HTMLInputElement;
    const clickSpy = vi.spyOn(input, "click");
    await user.click(dropzone);
    expect(clickSpy).not.toHaveBeenCalled();
  });
});

describe("StudyImageUpload — file picker happy path", () => {
  it("calls uploadStudyImageAction on file select + invokes onUploaded", async () => {
    const onUploaded = vi.fn();
    mockedAction.mockImplementationOnce(async (formData) => {
      expect(formData.get("kind")).toBe("BEFORE");
      expect(formData.get("studyId")).toBe("s1");
      expect(formData.get("file")).toBeInstanceOf(File);
      return actionOk(makeUploaded());
    });

    const user = userEvent.setup();
    render(
      <StudyImageUpload studyId="s1" kind="BEFORE" currentImage={null} onUploaded={onUploaded} />,
    );
    const input = screen.getByTestId("upload-file-input-before") as HTMLInputElement;
    await user.upload(input, makeFile());

    await waitFor(() => {
      expect(onUploaded).toHaveBeenCalledTimes(1);
    });
    expect(onUploaded).toHaveBeenCalledWith(expect.objectContaining({ id: "img-1", widthPx: 800 }));
    expect(toast.success).toHaveBeenCalled();
  });

  it("ignores empty file-input change events", async () => {
    const onUploaded = vi.fn();
    render(
      <StudyImageUpload studyId="s1" kind="BEFORE" currentImage={null} onUploaded={onUploaded} />,
    );
    const input = screen.getByTestId("upload-file-input-before") as HTMLInputElement;
    fireEvent.change(input, { target: { files: null } });
    expect(mockedAction).not.toHaveBeenCalled();
    expect(onUploaded).not.toHaveBeenCalled();
  });

  it("bypasses upload when the file input fires while disabled (defensive branch)", async () => {
    // The dropzone is disabled at the button level, but the file input
    // change handler still has an internal `disabled || isUploading`
    // guard. We dispatch the change event directly on the input — which
    // remains in the DOM — to exercise that guard.
    render(
      <StudyImageUpload
        studyId="s1"
        kind="BEFORE"
        currentImage={null}
        onUploaded={vi.fn()}
        disabled
      />,
    );
    const input = screen.getByTestId("upload-file-input-before") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile()] } });
    expect(mockedAction).not.toHaveBeenCalled();
  });
});

describe("StudyImageUpload — error responses", () => {
  it("toasts the German error message on file-too-large", async () => {
    mockedAction.mockResolvedValueOnce({
      ok: false,
      errorCode: "file-too-large",
      message: "10485760",
    });
    const user = userEvent.setup();
    render(
      <StudyImageUpload studyId="s1" kind="BEFORE" currentImage={null} onUploaded={vi.fn()} />,
    );
    const input = screen.getByTestId("upload-file-input-before") as HTMLInputElement;
    await user.upload(input, makeFile());
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("zu groß"));
    });
  });

  it("toasts the generic server error on an unknown errorCode", async () => {
    mockedAction.mockResolvedValueOnce({
      ok: false,
      errorCode: "weird-thing" as never,
    });
    const user = userEvent.setup();
    render(
      <StudyImageUpload studyId="s1" kind="BEFORE" currentImage={null} onUploaded={vi.fn()} />,
    );
    const input = screen.getByTestId("upload-file-input-before") as HTMLInputElement;
    await user.upload(input, makeFile());
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });

  it("toasts when the action returns ok=false with errorCode 'server'", async () => {
    mockedAction.mockResolvedValueOnce({ ok: false, errorCode: "server" });
    const user = userEvent.setup();
    render(
      <StudyImageUpload studyId="s1" kind="BEFORE" currentImage={null} onUploaded={vi.fn()} />,
    );
    const input = screen.getByTestId("upload-file-input-before") as HTMLInputElement;
    await user.upload(input, makeFile());
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });

  it("toasts when the Server Action itself throws (network / serialization)", async () => {
    mockedAction.mockRejectedValueOnce(new Error("ECONNRESET"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const user = userEvent.setup();
    render(
      <StudyImageUpload studyId="s1" kind="BEFORE" currentImage={null} onUploaded={vi.fn()} />,
    );
    const input = screen.getByTestId("upload-file-input-before") as HTMLInputElement;
    await user.upload(input, makeFile());
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe("StudyImageUpload — current image preview", () => {
  it("shows the image + replace button when a current image is set", () => {
    render(
      <StudyImageUpload
        studyId="s1"
        kind="BEFORE"
        currentImage={makeUploaded()}
        onUploaded={vi.fn()}
      />,
    );
    const img = screen.getByRole("img") as HTMLImageElement;
    expect(img.src).toContain("/api/uploads/img-1");
    expect(screen.getByText(/bild ersetzen/i)).toBeInTheDocument();
    expect(screen.getByText(/800×600/i)).toBeInTheDocument();
  });

  it("opens the file picker when the replace button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <StudyImageUpload
        studyId="s1"
        kind="BEFORE"
        currentImage={makeUploaded()}
        onUploaded={vi.fn()}
      />,
    );
    const input = screen.getByTestId("upload-file-input-before") as HTMLInputElement;
    const clickSpy = vi.spyOn(input, "click");
    await user.click(screen.getByText(/bild ersetzen/i));
    expect(clickSpy).toHaveBeenCalled();
  });

  it("uploads a replacement file via the same flow", async () => {
    mockedAction.mockResolvedValueOnce(
      actionOk(makeUploaded({ id: "img-2", widthPx: 1024, heightPx: 768 })),
    );
    const onUploaded = vi.fn();
    const user = userEvent.setup();
    render(
      <StudyImageUpload
        studyId="s1"
        kind="BEFORE"
        currentImage={makeUploaded()}
        onUploaded={onUploaded}
      />,
    );
    const input = screen.getByTestId("upload-file-input-before") as HTMLInputElement;
    await user.upload(input, makeFile("new.jpg"));
    await waitFor(() => {
      expect(onUploaded).toHaveBeenCalledWith(expect.objectContaining({ id: "img-2" }));
    });
  });
});

describe("StudyImageUpload — drag/drop", () => {
  function dataTransferWith(files: File[]): DataTransfer {
    // jsdom does not implement DataTransfer; build a minimal stand-in.
    return {
      files: files as unknown as FileList,
      items: [] as unknown as DataTransferItemList,
      types: [],
    } as unknown as DataTransfer;
  }

  it("dragEnter sets the dragging highlight, dragLeave clears it", () => {
    render(
      <StudyImageUpload studyId="s1" kind="BEFORE" currentImage={null} onUploaded={vi.fn()} />,
    );
    const dropzone = screen.getByTestId("upload-dropzone-before");
    fireEvent.dragEnter(dropzone, { dataTransfer: dataTransferWith([]) });
    // Highlight class applied — visible via the lime tint.
    expect(dropzone.className).toContain("bg-muted-lime/30");
    fireEvent.dragLeave(dropzone, { dataTransfer: dataTransferWith([]) });
    expect(dropzone.className).not.toContain("bg-muted-lime/30");
  });

  it("dragOver is accepted (preventDefault) so the drop event fires", () => {
    render(
      <StudyImageUpload studyId="s1" kind="BEFORE" currentImage={null} onUploaded={vi.fn()} />,
    );
    const dropzone = screen.getByTestId("upload-dropzone-before");
    const evt = new Event("dragover", { bubbles: true, cancelable: true });
    fireEvent(dropzone, evt);
    // No throw, no fetch — we only assert it didn't error.
    expect(dropzone).toBeInTheDocument();
  });

  it("dropping a file triggers the upload flow", async () => {
    mockedAction.mockResolvedValueOnce(actionOk(makeUploaded()));
    const onUploaded = vi.fn();
    render(
      <StudyImageUpload studyId="s1" kind="BEFORE" currentImage={null} onUploaded={onUploaded} />,
    );
    const dropzone = screen.getByTestId("upload-dropzone-before");
    const file = makeFile();
    fireEvent.drop(dropzone, { dataTransfer: dataTransferWith([file]) });
    await waitFor(() => {
      expect(onUploaded).toHaveBeenCalled();
    });
  });

  it("a drop without files is a no-op", async () => {
    render(
      <StudyImageUpload studyId="s1" kind="BEFORE" currentImage={null} onUploaded={vi.fn()} />,
    );
    const dropzone = screen.getByTestId("upload-dropzone-before");
    fireEvent.drop(dropzone, { dataTransfer: dataTransferWith([]) });
    // No action should be triggered for an empty drop.
    expect(mockedAction).not.toHaveBeenCalled();
  });

  it("dragEnter while disabled does NOT apply the highlight (defensive branch)", () => {
    render(
      <StudyImageUpload
        studyId="s1"
        kind="BEFORE"
        currentImage={null}
        onUploaded={vi.fn()}
        disabled
      />,
    );
    const dropzone = screen.getByTestId("upload-dropzone-before");
    fireEvent.dragEnter(dropzone, { dataTransfer: dataTransferWith([]) });
    // The highlight class stays absent because the early-return short-circuited.
    expect(dropzone.className).not.toContain("bg-muted-lime/30");
  });

  it("drop is ignored when disabled", async () => {
    render(
      <StudyImageUpload
        studyId="s1"
        kind="BEFORE"
        currentImage={null}
        onUploaded={vi.fn()}
        disabled
      />,
    );
    const dropzone = screen.getByTestId("upload-dropzone-before");
    fireEvent.drop(dropzone, { dataTransfer: dataTransferWith([makeFile()]) });
    expect(mockedAction).not.toHaveBeenCalled();
  });

  it("supports drag/drop on the preview tile when an image is already set", async () => {
    mockedAction.mockResolvedValueOnce(actionOk(makeUploaded({ id: "img-3" })));
    const onUploaded = vi.fn();
    render(
      <StudyImageUpload
        studyId="s1"
        kind="BEFORE"
        currentImage={makeUploaded()}
        onUploaded={onUploaded}
      />,
    );
    // The preview wrapper is the parent of the <img>.
    const img = screen.getByRole("img");
    const wrapper = img.parentElement as HTMLElement;
    fireEvent.dragEnter(wrapper, { dataTransfer: dataTransferWith([]) });
    fireEvent.drop(wrapper, { dataTransfer: dataTransferWith([makeFile("replace.jpg")]) });
    await waitFor(() => {
      expect(onUploaded).toHaveBeenCalledWith(expect.objectContaining({ id: "img-3" }));
    });
  });
});
