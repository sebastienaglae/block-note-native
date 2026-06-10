/**
 * DOM <-> model helpers for the web contentEditable surface. Kept separate so
 * the component file stays focused on React/event wiring.
 */
import {
  icText,
  isLink,
  isStyledText,
  normalizeInline,
  type InlineContent,
  type Styles,
} from "@bnn/core";
import type { Theme } from "../theme/theme";

const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/'/g, "&#39;").replace(/</g, "&lt;");
}

/** Inline CSS text for a styles object. */
export function cssText(styles: Styles, theme: Theme): string {
  const parts: string[] = [];
  if (styles.bold) parts.push("font-weight:700");
  if (styles.italic) parts.push("font-style:italic");
  const deco: string[] = [];
  if (styles.underline) deco.push("underline");
  if (styles.strike) deco.push("line-through");
  if (deco.length) parts.push(`text-decoration:${deco.join(" ")}`);
  if (styles.code) {
    parts.push(`font-family:${theme.monoFamily}`);
    parts.push(`background-color:${theme.colors.codeBackground}`);
    parts.push(`color:${theme.colors.code}`);
    parts.push("padding:0.1em 0.3em");
    parts.push("border-radius:3px");
    parts.push("font-size:0.9em");
  }
  if (styles.textColor && styles.textColor !== "default") {
    parts.push(`color:${theme.textColors[styles.textColor] ?? styles.textColor}`);
  }
  if (styles.backgroundColor && styles.backgroundColor !== "default") {
    parts.push(
      `background-color:${theme.highlightColors[styles.backgroundColor] ?? styles.backgroundColor}`,
    );
  }
  return parts.join(";");
}

/** Builds the innerHTML for a block's content. Returns the list of custom islands to mount. */
export function paintHtml(
  content: InlineContent[],
  theme: Theme,
): { html: string; customs: Array<{ idx: number; ic: InlineContent }> } {
  let html = "";
  const customs: Array<{ idx: number; ic: InlineContent }> = [];
  content.forEach((ic, idx) => {
    if (isStyledText(ic)) {
      const css = cssText(ic.styles, theme);
      html += `<span data-bnn="text" data-styles='${escapeAttr(
        JSON.stringify(ic.styles),
      )}'${css ? ` style="${css}"` : ""}>${escapeHtml(ic.text)}</span>`;
    } else if (isLink(ic)) {
      const text = ic.content.map((t) => t.text).join("");
      html += `<a data-bnn="link" data-json='${escapeAttr(
        JSON.stringify(ic),
      )}' href="${escapeAttr(ic.href)}" style="color:${theme.colors.accent};text-decoration:underline;cursor:pointer">${escapeHtml(
        text,
      )}</a>`;
    } else {
      const len = icText(ic).length || 1;
      html += `<span data-bnn="custom" data-idx="${idx}" data-len="${len}" data-json='${escapeAttr(
        JSON.stringify(ic),
      )}' contenteditable="false" style="user-select:none;display:inline-block">​</span>`;
      customs.push({ idx, ic });
    }
  });
  return { html, customs };
}

function stylesFromAncestors(textNode: Node, root: HTMLElement): Styles {
  const inferred: Styles = {};
  let fromData: Styles = {};
  let el: HTMLElement | null = textNode.parentElement;
  while (el && el !== root && root.contains(el)) {
    const ds = el.getAttribute("data-styles");
    if (ds) {
      try {
        fromData = { ...JSON.parse(ds), ...fromData };
      } catch {
        /* ignore */
      }
    }
    const tag = el.tagName;
    if (tag === "B" || tag === "STRONG") inferred.bold = true;
    if (tag === "I" || tag === "EM") inferred.italic = true;
    if (tag === "U") inferred.underline = true;
    if (tag === "S" || tag === "STRIKE" || tag === "DEL") inferred.strike = true;
    if (tag === "CODE") inferred.code = true;
    const st = el.style;
    if (st) {
      const fw = st.fontWeight;
      if (fw === "bold" || parseInt(fw, 10) >= 600) inferred.bold = true;
      if (st.fontStyle === "italic") inferred.italic = true;
      const td = `${st.textDecorationLine} ${st.textDecoration}`;
      if (td.includes("underline")) inferred.underline = true;
      if (td.includes("line-through")) inferred.strike = true;
    }
    el = el.parentElement;
  }
  return { ...inferred, ...fromData };
}

/** Reads the model back out of the DOM after an edit. */
export function readModel(root: HTMLElement): InlineContent[] {
  const out: InlineContent[] = [];
  const visit = (node: Node): void => {
    node.childNodes.forEach((child) => {
      if (child.nodeType === TEXT_NODE) {
        out.push({ type: "text", text: (child as Text).data, styles: stylesFromAncestors(child, root) });
        return;
      }
      if (child.nodeType !== ELEMENT_NODE) return;
      const el = child as HTMLElement;
      const bnn = el.getAttribute("data-bnn");
      if (bnn === "custom") {
        try {
          out.push(JSON.parse(el.getAttribute("data-json") || "null"));
        } catch {
          /* drop */
        }
        return;
      }
      if (bnn === "link") {
        const json = el.getAttribute("data-json");
        const text = el.textContent || "";
        if (json) {
          try {
            const link = JSON.parse(json);
            link.content = [{ type: "text", text, styles: {} }];
            out.push(link);
            return;
          } catch {
            /* fall through */
          }
        }
        out.push({ type: "link", href: el.getAttribute("href") || "", content: [{ type: "text", text, styles: {} }] });
        return;
      }
      if (el.tagName === "BR") {
        out.push({ type: "text", text: "\n", styles: {} });
        return;
      }
      visit(el);
    });
  };
  visit(root);
  return normalizeInline(out.filter(Boolean));
}

// ---- selection mapping ----------------------------------------------------

function measureFrag(frag: DocumentFragment | HTMLElement): number {
  let n = 0;
  frag.childNodes.forEach((node) => {
    if (node.nodeType === TEXT_NODE) {
      n += (node as Text).data.length;
    } else if (node.nodeType === ELEMENT_NODE) {
      const el = node as HTMLElement;
      if (el.getAttribute("data-bnn") === "custom") n += Number(el.getAttribute("data-len") || 1);
      else if (el.tagName === "BR") n += 1;
      else n += measureFrag(el);
    }
  });
  return n;
}

/** Converts a DOM point (container, offset) to a model char offset. */
export function domPointToOffset(root: HTMLElement, container: Node, offset: number): number {
  const range = document.createRange();
  range.selectNodeContents(root);
  try {
    range.setEnd(container, offset);
  } catch {
    return measureFrag(root);
  }
  return measureFrag(range.cloneContents());
}

export function getSelectionOffsets(root: HTMLElement): { start: number; end: number } | null {
  const sel = root.ownerDocument.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const r = sel.getRangeAt(0);
  if (!root.contains(r.startContainer) || !root.contains(r.endContainer)) return null;
  const a = domPointToOffset(root, r.startContainer, r.startOffset);
  const b = domPointToOffset(root, r.endContainer, r.endOffset);
  return { start: Math.min(a, b), end: Math.max(a, b) };
}

function pointBefore(el: Node): { node: Node; offset: number } {
  const parent = el.parentNode!;
  return { node: parent, offset: Array.prototype.indexOf.call(parent.childNodes, el) };
}
function pointAfter(el: Node): { node: Node; offset: number } {
  const parent = el.parentNode!;
  return { node: parent, offset: Array.prototype.indexOf.call(parent.childNodes, el) + 1 };
}

function locate(root: HTMLElement, target: number): { node: Node; offset: number } {
  let acc = 0;
  let result: { node: Node; offset: number } | null = null;
  const walk = (node: Node): void => {
    for (let i = 0; i < node.childNodes.length; i++) {
      if (result) return;
      const child = node.childNodes[i];
      if (child.nodeType === TEXT_NODE) {
        const len = (child as Text).data.length;
        if (target <= acc + len) {
          result = { node: child, offset: target - acc };
          return;
        }
        acc += len;
      } else if (child.nodeType === ELEMENT_NODE) {
        const el = child as HTMLElement;
        if (el.getAttribute("data-bnn") === "custom") {
          const len = Number(el.getAttribute("data-len") || 1);
          if (target <= acc) {
            result = pointBefore(el);
            return;
          }
          if (target < acc + len) {
            result = pointAfter(el);
            return;
          }
          acc += len;
        } else if (el.tagName === "BR") {
          if (target <= acc) {
            result = pointBefore(el);
            return;
          }
          acc += 1;
        } else {
          walk(el);
        }
      }
    }
  };
  walk(root);
  if (!result) {
    if (root.childNodes.length) {
      const last = root.childNodes[root.childNodes.length - 1];
      result =
        last.nodeType === TEXT_NODE
          ? { node: last, offset: (last as Text).data.length }
          : pointAfter(last);
    } else {
      result = { node: root, offset: 0 };
    }
  }
  return result;
}

export function setSelectionOffsets(root: HTMLElement, start: number, end: number): void {
  const s = locate(root, start);
  const e = locate(root, end);
  const range = document.createRange();
  try {
    range.setStart(s.node, s.offset);
    range.setEnd(e.node, e.offset);
  } catch {
    return;
  }
  const sel = root.ownerDocument.getSelection();
  if (!sel) return;
  sel.removeAllRanges();
  sel.addRange(range);
}
