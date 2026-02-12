import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import i18n from "../i18n/config";

// ── useDirection hook tests ─────────────────────────────────────────────────

let mockLanguage = "en";

vi.mock("react-i18next", async () => {
  const actual = await vi.importActual("react-i18next");
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key,
      i18n: {
        get language() {
          return mockLanguage;
        },
        changeLanguage: vi.fn((lang: string) => {
          mockLanguage = lang;
          return Promise.resolve();
        }),
      },
    }),
  };
});

// Import after mock setup
import { useDirection } from "../hooks/useDirection";
import { BiDirectionalText } from "../components/common/BiDirectionalText";
import { DirectionalIcon } from "../components/common/DirectionalIcon";

function DirectionTestHelper() {
  const { dir, isRTL, locale } = useDirection();
  return (
    <div
      data-testid="direction-info"
      data-dir={dir}
      data-is-rtl={String(isRTL)}
      data-locale={locale}
    />
  );
}

describe("RTL layout — i18n integration", () => {
  afterEach(() => {
    i18n.changeLanguage("en");
  });

  it("document direction changes to RTL for Persian", () => {
    i18n.changeLanguage("fa");
    expect(document.documentElement.dir).toBe("rtl");
  });

  it("document direction changes to LTR for English", () => {
    i18n.changeLanguage("en");
    expect(document.documentElement.dir).toBe("ltr");
  });

  it("language attribute updates on language change", () => {
    i18n.changeLanguage("fa");
    expect(document.documentElement.lang).toBe("fa");
    i18n.changeLanguage("en");
    expect(document.documentElement.lang).toBe("en");
  });
});

describe("useDirection hook", () => {
  beforeEach(() => {
    mockLanguage = "en";
  });

  it("returns LTR for English locale", () => {
    render(<DirectionTestHelper />);
    const el = screen.getByTestId("direction-info");
    expect(el.dataset.dir).toBe("ltr");
    expect(el.dataset.isRtl).toBe("false");
    expect(el.dataset.locale).toBe("en");
  });

  it("returns RTL for Persian locale", () => {
    mockLanguage = "fa";
    render(<DirectionTestHelper />);
    const el = screen.getByTestId("direction-info");
    expect(el.dataset.dir).toBe("rtl");
    expect(el.dataset.isRtl).toBe("true");
    expect(el.dataset.locale).toBe("fa");
  });
});

describe("BiDirectionalText", () => {
  it("renders with forced LTR direction", () => {
    render(
      <BiDirectionalText forceDir="ltr" data-testid="bidi">
        Hello
      </BiDirectionalText>,
    );
    const el = screen.getByText("Hello");
    expect(el.getAttribute("dir")).toBe("ltr");
  });

  it("renders with forced RTL direction", () => {
    render(<BiDirectionalText forceDir="rtl">سلام</BiDirectionalText>);
    const el = screen.getByText("سلام");
    expect(el.getAttribute("dir")).toBe("rtl");
  });

  it("auto-detects Latin text as LTR", () => {
    render(<BiDirectionalText>FC60 Stamp</BiDirectionalText>);
    const el = screen.getByText("FC60 Stamp");
    expect(el.getAttribute("dir")).toBe("ltr");
  });

  it("auto-detects Persian text as RTL", () => {
    render(<BiDirectionalText>سلام دنیا</BiDirectionalText>);
    const el = screen.getByText("سلام دنیا");
    expect(el.getAttribute("dir")).toBe("rtl");
  });

  it("renders as a different HTML element via 'as' prop", () => {
    render(
      <BiDirectionalText as="div" forceDir="ltr">
        test
      </BiDirectionalText>,
    );
    const el = screen.getByText("test");
    expect(el.tagName.toLowerCase()).toBe("div");
  });

  it("applies unicode-bidi isolate style", () => {
    render(<BiDirectionalText forceDir="ltr">test</BiDirectionalText>);
    const el = screen.getByText("test");
    expect(el.style.unicodeBidi).toBe("isolate");
  });
});

describe("DirectionalIcon", () => {
  beforeEach(() => {
    mockLanguage = "en";
  });

  it("does not flip in LTR mode", () => {
    render(
      <DirectionalIcon>
        <svg data-testid="icon" />
      </DirectionalIcon>,
    );
    const wrapper = screen.getByTestId("directional-icon");
    expect(wrapper.style.transform).toBeFalsy();
  });

  it("flips in RTL mode when flip=true (default)", () => {
    mockLanguage = "fa";
    render(
      <DirectionalIcon>
        <svg data-testid="icon" />
      </DirectionalIcon>,
    );
    const wrapper = screen.getByTestId("directional-icon");
    expect(wrapper.style.transform).toBe("scaleX(-1)");
  });

  it("does NOT flip in RTL mode when flip=false", () => {
    mockLanguage = "fa";
    render(
      <DirectionalIcon flip={false}>
        <svg data-testid="icon" />
      </DirectionalIcon>,
    );
    const wrapper = screen.getByTestId("directional-icon");
    expect(wrapper.style.transform).toBeFalsy();
  });
});
