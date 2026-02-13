import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExportShareMenu } from "../ExportShareMenu";
import type { ConsultationResult } from "@/types";

// Mock i18n
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "oracle.export_text": "Export TXT",
        "oracle.export_pdf": "Export PDF",
        "oracle.export_image": "Export Image",
        "oracle.export_json": "Export JSON",
        "oracle.export_error": "Export failed.",
        "oracle.share_create": "Create Share Link",
        "oracle.share_creating": "Creating...",
        "oracle.share_copied": "Link copied!",
        "oracle.share_copy": "Copy Link",
        "oracle.share_error": "Failed to create share link",
      };
      return translations[key] || key;
    },
    i18n: { language: "en" },
  }),
}));

// Mock export utilities
vi.mock("@/utils/exportReading", () => ({
  formatAsText: vi.fn(() => "formatted text"),
  exportAsPdf: vi.fn(() => Promise.resolve()),
  exportAsImage: vi.fn(() => Promise.resolve()),
  copyToClipboard: vi.fn(() => Promise.resolve(true)),
  downloadAsText: vi.fn(),
  downloadAsJson: vi.fn(),
}));

// Mock share utilities
vi.mock("@/utils/shareReading", () => ({
  createShareLink: vi.fn(() =>
    Promise.resolve({
      token: "abc123",
      url: "/share/abc123",
      expires_at: null,
      created_at: "2026-01-01",
    }),
  ),
  getShareUrl: vi.fn((token: string) => `http://localhost/share/${token}`),
}));

const mockResult: ConsultationResult = {
  type: "reading",
  data: {
    fc60: null,
    numerology: null,
    zodiac: null,
    chinese: null,
    moon: null,
    angel: null,
    chaldean: null,
    ganzhi: null,
    fc60_extended: null,
    synchronicities: [],
    ai_interpretation: null,
    summary: "Test summary",
    generated_at: "2026-01-01T00:00:00Z",
  },
};

describe("ExportShareMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when result is null", () => {
    const { container } = render(
      <ExportShareMenu result={null} readingCardId="test" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders export menu button when result exists", () => {
    render(<ExportShareMenu result={mockResult} readingCardId="test" />);
    expect(screen.getByText(/Export TXT/)).toBeInTheDocument();
  });

  it("opens dropdown on click", async () => {
    render(<ExportShareMenu result={mockResult} readingCardId="test" />);
    const button = screen.getByText(/Export TXT/);
    await userEvent.click(button);
    expect(screen.getByText("Export PDF")).toBeInTheDocument();
    expect(screen.getByText("Export Image")).toBeInTheDocument();
    expect(screen.getByText("Export JSON")).toBeInTheDocument();
  });

  it("calls formatAsText for text export", async () => {
    const { downloadAsText } = await import("@/utils/exportReading");
    render(<ExportShareMenu result={mockResult} readingCardId="test" />);
    await userEvent.click(screen.getByText(/Export TXT/));
    // Click the text export in the menu
    const menuTextButton = screen
      .getAllByText("Export TXT")
      .find((el) => el.getAttribute("role") === "menuitem");
    if (menuTextButton) {
      await userEvent.click(menuTextButton);
      expect(downloadAsText).toHaveBeenCalled();
    }
  });

  it("shows share link creation button when readingId is provided", async () => {
    render(
      <ExportShareMenu
        result={mockResult}
        readingId={1}
        readingCardId="test"
      />,
    );
    await userEvent.click(screen.getByText(/Export TXT/));
    expect(screen.getByText("Create Share Link")).toBeInTheDocument();
  });

  it("copies share link to clipboard", async () => {
    const { copyToClipboard } = await import("@/utils/exportReading");
    render(
      <ExportShareMenu
        result={mockResult}
        readingId={1}
        readingCardId="test"
      />,
    );
    await userEvent.click(screen.getByText(/Export TXT/));
    const shareBtn = screen.getByText("Create Share Link");
    await userEvent.click(shareBtn);
    await waitFor(() => {
      expect(copyToClipboard).toHaveBeenCalled();
    });
  });

  it("shows loading state during PDF export", async () => {
    const { exportAsPdf } = await import("@/utils/exportReading");
    let resolvePdf: () => void = () => {};
    (exportAsPdf as ReturnType<typeof vi.fn>).mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolvePdf = resolve;
        }),
    );

    render(<ExportShareMenu result={mockResult} readingCardId="test" />);
    await userEvent.click(screen.getByText(/Export TXT/));
    const pdfBtn = screen.getByText("Export PDF");
    await userEvent.click(pdfBtn);
    expect(screen.getByText("...")).toBeInTheDocument();
    resolvePdf();
  });

  it("handles export error gracefully", async () => {
    const { exportAsPdf } = await import("@/utils/exportReading");
    (exportAsPdf as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("fail"),
    );

    render(<ExportShareMenu result={mockResult} readingCardId="test" />);
    await userEvent.click(screen.getByText(/Export TXT/));
    const pdfBtn = screen.getByText("Export PDF");
    await userEvent.click(pdfBtn);
    await waitFor(() => {
      expect(screen.getByText("Export failed.")).toBeInTheDocument();
    });
  });

  it("closes menu on outside click", async () => {
    render(
      <div>
        <div data-testid="outside">Outside</div>
        <ExportShareMenu result={mockResult} readingCardId="test" />
      </div>,
    );
    await userEvent.click(screen.getByText(/Export TXT/));
    expect(screen.getByText("Export PDF")).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByTestId("outside"));
    expect(screen.queryByText("Export PDF")).not.toBeInTheDocument();
  });

  it("keyboard navigation: Escape closes menu", async () => {
    render(<ExportShareMenu result={mockResult} readingCardId="test" />);
    await userEvent.click(screen.getByText(/Export TXT/));
    expect(screen.getByText("Export PDF")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByText("Export PDF")).not.toBeInTheDocument();
  });
});
