/**
 * Markdown "input rules": when a user types a prefix at the start of a block,
 * the block transforms (e.g. "# " -> heading). The UI calls {@link matchMarkdownInput}
 * after each content change on a paragraph and applies the result.
 */

export interface MarkdownInputMatch {
  type: string;
  props?: Record<string, unknown>;
  /** Number of leading chars to strip from the block content after transforming. */
  stripLength: number;
  /** When true the block becomes void (divider) and content is dropped. */
  void?: boolean;
}

export function matchMarkdownInput(text: string): MarkdownInputMatch | null {
  // Divider / code fence don't need a trailing space.
  if (text === "---" || text === "***") return { type: "divider", stripLength: text.length, void: true };
  if (text === "```" || /^```[a-zA-Z0-9]*$/.test(text)) {
    const lang = text.slice(3) || "text";
    return { type: "codeBlock", props: { language: lang }, stripLength: text.length };
  }

  const heading = /^(#{1,3}) /.exec(text);
  if (heading) return { type: "heading", props: { level: heading[1].length }, stripLength: heading[1].length + 1 };

  if (/^[-*+] /.test(text)) return { type: "bulletListItem", stripLength: 2 };

  const numbered = /^(\d+)\. /.exec(text);
  if (numbered) return { type: "numberedListItem", stripLength: numbered[0].length };

  if (/^\[[xX]\] /.test(text)) return { type: "checkListItem", props: { checked: true }, stripLength: 4 };
  if (/^\[ ?\] /.test(text)) {
    const stripLength = text.startsWith("[ ]") ? 4 : 3;
    return { type: "checkListItem", props: { checked: false }, stripLength };
  }

  if (/^> /.test(text)) return { type: "quote", stripLength: 2 };

  return null;
}
