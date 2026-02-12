import i18n from "../i18n/config";

describe("RTL layout", () => {
  afterEach(() => {
    i18n.changeLanguage("en");
  });

  test("document direction changes to RTL for Persian", () => {
    i18n.changeLanguage("fa");
    expect(document.documentElement.dir).toBe("rtl");
  });

  test("document direction changes to LTR for English", () => {
    i18n.changeLanguage("en");
    expect(document.documentElement.dir).toBe("ltr");
  });

  test("language attribute updates on language change", () => {
    i18n.changeLanguage("fa");
    expect(document.documentElement.lang).toBe("fa");
    i18n.changeLanguage("en");
    expect(document.documentElement.lang).toBe("en");
  });
});
