/**
 * Pure helpers for manipulating arrays of {@link InlineContent}.
 *
 * Char-offset model: every node contributes characters equal to its visible
 * text length. {@link StyledText} can be split at any offset; {@link Link} and
 * custom inline content are atomic — if a cut lands inside them they degrade to
 * plain text for the overlapping slice (predictable, lossless-enough for MVP).
 */
import type {
  InlineContent,
  Link,
  PartialInlineContent,
  StyledText,
  Styles,
} from "../model/types";

export type StyleMode = "add" | "remove" | "toggle";

export function isStyledText(ic: InlineContent): ic is StyledText {
  return ic.type === "text";
}

export function isLink(ic: InlineContent): ic is Link {
  return ic.type === "link";
}

/** Visible text of a single inline node. */
export function icText(ic: InlineContent): string {
  if (isStyledText(ic)) return ic.text;
  if (isLink(ic)) return ic.content.map((t) => t.text).join("");
  const content = ic.content;
  return Array.isArray(content) ? content.map((t) => t.text).join("") : "";
}

export function inlineToString(content: InlineContent[] | undefined): string {
  if (!content) return "";
  return content.map(icText).join("");
}

export function inlineLength(content: InlineContent[] | undefined): number {
  return inlineToString(content).length;
}

function cloneIc(ic: InlineContent): InlineContent {
  if (isStyledText(ic)) return { type: "text", text: ic.text, styles: { ...ic.styles } };
  if (isLink(ic))
    return {
      type: "link",
      href: ic.href,
      content: ic.content.map((t) => ({ type: "text", text: t.text, styles: { ...t.styles } })),
    };
  return JSON.parse(JSON.stringify(ic)) as InlineContent;
}

/** Two style sets are equal if every key has the same truthy/value (undefined ~= false). */
export function sameStyles(a: Styles, b: Styles): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    const av = (a as Record<string, unknown>)[k];
    const bv = (b as Record<string, unknown>)[k];
    if (av === bv) continue;
    if (!av && !bv) continue; // undefined vs false vs ""
    return false;
  }
  return true;
}

/** Merges adjacent text runs with equal styles and drops empty runs. */
export function normalizeInline(content: InlineContent[]): InlineContent[] {
  const out: InlineContent[] = [];
  for (const raw of content) {
    if (isStyledText(raw)) {
      if (raw.text.length === 0) continue;
      const prev = out[out.length - 1];
      if (prev && isStyledText(prev) && sameStyles(prev.styles, raw.styles)) {
        prev.text += raw.text;
        continue;
      }
      out.push({ type: "text", text: raw.text, styles: { ...raw.styles } });
    } else {
      out.push(cloneIc(raw));
    }
  }
  return out;
}

/** Returns the content between [start, end) in char offsets. */
export function sliceInline(
  content: InlineContent[],
  start: number,
  end: number,
): InlineContent[] {
  const out: InlineContent[] = [];
  let pos = 0;
  for (const ic of content) {
    const len = icText(ic).length;
    const icStart = pos;
    const icEnd = pos + len;
    pos = icEnd;
    if (icEnd <= start || icStart >= end) continue; // fully outside

    const from = Math.max(0, start - icStart);
    const to = Math.min(len, end - icStart);

    if (isStyledText(ic)) {
      const text = ic.text.slice(from, to);
      if (text.length) out.push({ type: "text", text, styles: { ...ic.styles } });
    } else if (icStart >= start && icEnd <= end) {
      out.push(cloneIc(ic)); // atomic node fully selected
    } else {
      const sliced = icText(ic).slice(from, to); // partial atomic -> plain text
      if (sliced) out.push({ type: "text", text: sliced, styles: {} });
    }
  }
  return normalizeInline(out);
}

/** Replaces [start, end) with `replacement`. */
export function spliceInline(
  content: InlineContent[],
  start: number,
  end: number,
  replacement: InlineContent[],
): InlineContent[] {
  const total = inlineLength(content);
  const before = sliceInline(content, 0, start);
  const after = sliceInline(content, end, total);
  return normalizeInline([...before, ...replacement, ...after]);
}

/** Inserts plain/styled text at `pos`. */
export function insertText(
  content: InlineContent[],
  pos: number,
  text: string,
  styles: Styles = {},
): InlineContent[] {
  if (!text) return content;
  return spliceInline(content, pos, pos, [{ type: "text", text, styles }]);
}

function mergeStyles(base: Styles, changes: Styles): Styles {
  const out: Styles = { ...base };
  for (const [k, v] of Object.entries(changes)) {
    if (v === undefined || v === false || v === "default" || v === "") {
      delete (out as Record<string, unknown>)[k];
    } else {
      (out as Record<string, unknown>)[k] = v;
    }
  }
  return out;
}

/** True if every text run in `content` carries a truthy value for `key`. */
export function rangeHasStyle(content: InlineContent[], key: keyof Styles): boolean {
  const texts = content.filter(isStyledText);
  if (!texts.length) return false;
  return texts.every((t) => !!t.styles[key]);
}

function resolveStyles(middle: InlineContent[], styles: Styles, mode: StyleMode): Styles {
  if (mode === "add") return styles;
  if (mode === "remove") {
    const out: Styles = {};
    for (const k of Object.keys(styles)) (out as Record<string, unknown>)[k] = undefined;
    return out;
  }
  // toggle: turn a style off if the whole range already has it, else on
  const out: Styles = {};
  for (const [k, v] of Object.entries(styles)) {
    const has = rangeHasStyle(middle, k as keyof Styles);
    (out as Record<string, unknown>)[k] = has ? undefined : v;
  }
  return out;
}

/** Applies/removes/toggles `styles` over the [start, end) range. */
export function applyStylesToRange(
  content: InlineContent[],
  start: number,
  end: number,
  styles: Styles,
  mode: StyleMode,
): InlineContent[] {
  if (start === end) return content;
  const total = inlineLength(content);
  const before = sliceInline(content, 0, start);
  const middle = sliceInline(content, start, end);
  const after = sliceInline(content, end, total);
  const changes = resolveStyles(middle, styles, mode);
  const newMiddle = middle.map((ic) =>
    isStyledText(ic)
      ? ({ type: "text", text: ic.text, styles: mergeStyles(ic.styles, changes) } as StyledText)
      : ic,
  );
  return normalizeInline([...before, ...newMiddle, ...after]);
}

/** Styles active at a caret position (used to "carry" marks while typing). */
export function stylesAt(content: InlineContent[], pos: number): Styles {
  let acc = 0;
  for (const ic of content) {
    const len = icText(ic).length;
    if (pos <= acc + len) {
      if (isStyledText(ic)) return { ...ic.styles };
      return {};
    }
    acc += len;
  }
  const last = content[content.length - 1];
  return last && isStyledText(last) ? { ...last.styles } : {};
}

/** Normalizes the loose builder shape into canonical inline content. */
export function partialToInline(partial?: PartialInlineContent): InlineContent[] {
  if (partial == null) return [];
  const arr = Array.isArray(partial) ? partial : [partial];
  const out: InlineContent[] = [];
  for (const item of arr) {
    if (typeof item === "string") {
      if (item) out.push({ type: "text", text: item, styles: {} });
    } else {
      out.push(item);
    }
  }
  return normalizeInline(out);
}
