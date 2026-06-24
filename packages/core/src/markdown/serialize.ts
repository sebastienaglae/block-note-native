/** Lightweight markdown + JSON (de)serialization for persistence and export. */
import type { Block, CustomInlineContent, InlineContent, PartialBlock, StyledText } from "../model/types";
import { icText, isLink, isStyledText } from "../util/inline";

/**
 * Per-type markdown serializers for custom / special content. A host (or the
 * schema produced by `createBlockNoteSchema`) supplies these so custom blocks
 * and inline content export to meaningful markdown instead of bare text.
 */
export interface MarkdownSerializers {
  /** Keyed by block `type`. Return a markdown string, or `null`/`undefined` to fall back to the built-in handling. */
  blocks?: Record<
    string,
    (block: Block, ctx: { inline: (content: InlineContent[] | undefined) => string }) => string | null | undefined
  >;
  /** Keyed by inline `type`. Return the markdown for a custom inline node (e.g. `@Alice`). */
  inline?: Record<string, (ic: CustomInlineContent) => string | null | undefined>;
}

// ---- inline ---------------------------------------------------------------

function inlineToMarkdown(
  content: InlineContent[] | undefined,
  serializers?: MarkdownSerializers,
): string {
  if (!content) return "";
  return content
    .map((ic) => {
      if (isStyledText(ic)) return styleText(ic);
      if (isLink(ic)) return `[${ic.content.map(styleText).join("")}](${ic.href})`;
      const custom = serializers?.inline?.[ic.type]?.(ic as CustomInlineContent);
      if (custom != null) return custom;
      return icText(ic); // custom inline -> its visible text
    })
    .join("");
}

function styleText(t: StyledText): string {
  let out = t.text;
  if (!out) return out;
  if (t.styles.code) out = "`" + out + "`";
  if (t.styles.bold) out = "**" + out + "**";
  if (t.styles.italic) out = "*" + out + "*";
  if (t.styles.strike) out = "~~" + out + "~~";
  return out;
}

// ---- blocks ---------------------------------------------------------------

function blockToMarkdown(
  block: Block,
  depth: number,
  numberedIndex: number,
  serializers?: MarkdownSerializers,
): string {
  const indent = "  ".repeat(depth);
  const text = inlineToMarkdown(block.content, serializers);
  const p = block.props as Record<string, unknown>;
  const str = (v: unknown): string => (v == null ? "" : String(v));
  let line: string | null | undefined;

  // 1) Host-provided serializer for this (custom) block type wins.
  const custom = serializers?.blocks?.[block.type]?.(block, {
    inline: (c) => inlineToMarkdown(c, serializers),
  });
  if (custom != null) {
    line = custom;
  } else {
    switch (block.type) {
      case "heading":
      case "toggleHeading":
        line = `${"#".repeat(Number(p.level) || 1)} ${text}`;
        break;
      case "bulletListItem":
        line = `- ${text}`;
        break;
      case "toggleListItem":
        line = `- ${text}`;
        break;
      case "numberedListItem":
        line = `${numberedIndex}. ${text}`;
        break;
      case "checkListItem":
        line = `- [${p.checked ? "x" : " "}] ${text}`;
        break;
      case "quote":
        line = `> ${text}`;
        break;
      case "codeBlock":
        line = `\`\`\`${str(p.language)}\n${text}\n\`\`\``;
        break;
      case "divider":
        line = "---";
        break;
      case "image":
        line = `![${str(p.caption)}](${str(p.url)})`;
        break;
      // --- special / media blocks: emit meaningful markdown instead of "" ---
      case "video":
        line = `[📹 ${str(p.caption) || "Video"}](${str(p.url)})`;
        break;
      case "audio":
        line = `[🎵 ${str(p.caption) || "Audio"}](${str(p.url)})`;
        break;
      case "file":
        line = `[📎 ${str(p.name) || "File"}](${str(p.url)})`;
        break;
      case "bookmark":
        line = `[🔖 ${str(p.title) || str(p.url)}](${str(p.url)})`;
        break;
      case "mapView":
        line = `[🗺 ${str(p.query) || "Map"}](https://www.openstreetmap.org/search?query=${encodeURIComponent(str(p.query))})`;
        break;
      case "pageLink":
        line = `[${str(p.icon)} ${str(p.title) || "Untitled"}](#${str(p.pageId)})`;
        break;
      case "table":
        line = tableToMarkdown(p.cells);
        break;
      default:
        line = text;
    }
  }
  let out = indent + (line ?? text);
  if (block.children.length) out += "\n" + blocksToMarkdown(block.children, serializers, depth + 1);
  return out;
}

/** Renders a 2D cell array as a GitHub-flavored markdown table. */
function tableToMarkdown(cells: unknown): string {
  if (!Array.isArray(cells) || cells.length === 0) return "";
  const rows = cells as unknown[][];
  const cols = Math.max(...rows.map((r) => (Array.isArray(r) ? r.length : 0)));
  const cell = (r: unknown[], c: number): string => String(r?.[c] ?? "").replace(/\|/g, "\\|");
  const [head, ...body] = rows;
  const headLine = `| ${Array.from({ length: cols }, (_, c) => cell(head, c)).join(" | ")} |`;
  const sep = `| ${Array.from({ length: cols }, () => "---").join(" | ")} |`;
  const bodyLines = body.map(
    (r) => `| ${Array.from({ length: cols }, (_, c) => cell(r, c)).join(" | ")} |`,
  );
  return [headLine, sep, ...bodyLines].join("\n");
}

export function blocksToMarkdown(
  blocks: Block[],
  serializers?: MarkdownSerializers,
  depth = 0,
): string {
  let n = 0;
  return blocks
    .map((b) => {
      if (b.type === "numberedListItem") n += 1;
      else n = 0;
      return blockToMarkdown(b, depth, n, serializers);
    })
    .join("\n");
}

// ---- markdown -> blocks (line based; good enough for round-tripping) ------

function parseInline(text: string): InlineContent[] {
  // Minimal: links + bold/italic/code via a single pass.
  const out: InlineContent[] = [];
  const linkRe = /\[([^\]]*)\]\(([^)]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(text))) {
    if (m.index > last) out.push(...parseStyles(text.slice(last, m.index)));
    out.push({ type: "link", href: m[2], content: [{ type: "text", text: m[1], styles: {} }] });
    last = linkRe.lastIndex;
  }
  if (last < text.length) out.push(...parseStyles(text.slice(last)));
  return out;
}

function parseStyles(text: string): InlineContent[] {
  // Decode the markers we emit. Order matters: strike, bold, italic, code.
  const tokens: InlineContent[] = [];
  const re = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(~~([^~]+)~~)|(`([^`]+)`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) tokens.push({ type: "text", text: text.slice(last, m.index), styles: {} });
    if (m[2] !== undefined) tokens.push({ type: "text", text: m[2], styles: { bold: true } });
    else if (m[4] !== undefined) tokens.push({ type: "text", text: m[4], styles: { italic: true } });
    else if (m[6] !== undefined) tokens.push({ type: "text", text: m[6], styles: { strike: true } });
    else if (m[8] !== undefined) tokens.push({ type: "text", text: m[8], styles: { code: true } });
    last = re.lastIndex;
  }
  if (last < text.length) tokens.push({ type: "text", text: text.slice(last), styles: {} });
  return tokens.length ? tokens : [{ type: "text", text, styles: {} }];
}

export function markdownToBlocks(markdown: string): PartialBlock[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: PartialBlock[] = [];
  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trimStart();
    if (line === "") {
      i++;
      continue;
    }
    if (line === "---" || line === "***") {
      blocks.push({ type: "divider" });
      i++;
      continue;
    }
    if (line.startsWith("```")) {
      const language = line.slice(3) || "text";
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) buf.push(lines[i++]);
      i++; // closing fence
      blocks.push({ type: "codeBlock", props: { language }, content: buf.join("\n") });
      continue;
    }
    const heading = /^(#{1,6}) (.*)$/.exec(line);
    if (heading) {
      blocks.push({
        type: "heading",
        props: { level: Math.min(3, heading[1].length) },
        content: parseInline(heading[2]),
      });
      i++;
      continue;
    }
    const check = /^- \[([ xX])\] (.*)$/.exec(line);
    if (check) {
      blocks.push({
        type: "checkListItem",
        props: { checked: check[1].toLowerCase() === "x" },
        content: parseInline(check[2]),
      });
      i++;
      continue;
    }
    const bullet = /^[-*+] (.*)$/.exec(line);
    if (bullet) {
      blocks.push({ type: "bulletListItem", content: parseInline(bullet[1]) });
      i++;
      continue;
    }
    const numbered = /^\d+\. (.*)$/.exec(line);
    if (numbered) {
      blocks.push({ type: "numberedListItem", content: parseInline(numbered[1]) });
      i++;
      continue;
    }
    const quote = /^> (.*)$/.exec(line);
    if (quote) {
      blocks.push({ type: "quote", content: parseInline(quote[1]) });
      i++;
      continue;
    }
    const image = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(line);
    if (image) {
      blocks.push({ type: "image", props: { caption: image[1], url: image[2] } });
      i++;
      continue;
    }
    blocks.push({ type: "paragraph", content: parseInline(line) });
    i++;
  }
  return blocks;
}

// ---- JSON -----------------------------------------------------------------

export function blocksToJSON(blocks: Block[]): string {
  return JSON.stringify(blocks, null, 2);
}

export function jsonToBlocks(json: string): PartialBlock[] {
  return JSON.parse(json) as PartialBlock[];
}
