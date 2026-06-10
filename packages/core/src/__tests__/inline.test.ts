import { describe, expect, it } from "vitest";
import {
  applyStylesToRange,
  inlineToString,
  isStyledText,
  normalizeInline,
  sliceInline,
  spliceInline,
  stylesAt,
} from "../util/inline";
import type { InlineContent } from "../model/types";

const t = (text: string, styles = {}): InlineContent => ({ type: "text", text, styles });

describe("inline utilities", () => {
  it("flattens to string", () => {
    expect(inlineToString([t("Hello "), t("world", { bold: true })])).toBe("Hello world");
  });

  it("slices across runs", () => {
    const content = [t("Hello "), t("world", { bold: true })];
    expect(inlineToString(sliceInline(content, 3, 8))).toBe("lo wo");
    const sliced = sliceInline(content, 6, 11);
    expect(sliced).toHaveLength(1);
    expect(sliced[0]).toMatchObject({ text: "world", styles: { bold: true } });
  });

  it("merges adjacent equal runs on normalize", () => {
    const normalized = normalizeInline([t("a"), t("b"), t("c", { bold: true })]);
    expect(normalized).toHaveLength(2);
    expect(normalized[0]).toMatchObject({ text: "ab" });
  });

  it("toggles bold over a range and back", () => {
    const content = [t("Hello world")];
    const bolded = applyStylesToRange(content, 0, 5, { bold: true }, "toggle");
    expect(bolded[0]).toMatchObject({ text: "Hello", styles: { bold: true } });
    expect(bolded[1]).toMatchObject({ text: " world", styles: {} });

    const unbolded = applyStylesToRange(bolded, 0, 5, { bold: true }, "toggle");
    expect(inlineToString(unbolded)).toBe("Hello world");
    expect(unbolded).toHaveLength(1);
    expect(isStyledText(unbolded[0]) && unbolded[0].styles.bold).toBeFalsy();
  });

  it("splices replacement content", () => {
    const content = [t("Hello world")];
    const out = spliceInline(content, 6, 11, [t("there", { italic: true })]);
    expect(inlineToString(out)).toBe("Hello there");
    expect(out[1]).toMatchObject({ text: "there", styles: { italic: true } });
  });

  it("reports caret styles", () => {
    const content = [t("ab"), t("cd", { bold: true })];
    expect(stylesAt(content, 1)).toEqual({});
    expect(stylesAt(content, 3)).toEqual({ bold: true });
  });
});
