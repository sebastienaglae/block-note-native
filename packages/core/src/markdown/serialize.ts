/** Lightweight markdown + JSON (de)serialization for persistence and export. */
import type { Block, InlineContent, PartialBlock, StyledText } from "../model/types";
import { icText, isLink, isStyledText } from "../util/inline";

// ---- inline ---------------------------------------------------------------

function inlineToMarkdown(content: InlineContent[] | undefined): string {
  if (!content) return "";
  return content
    .map((ic) => {
      if (isStyledText(ic)) return styleText(ic);
      if (isLink(ic)) return `[${ic.content.map(styleText).join("")}](${ic.href})`;
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

function blockToMarkdown(block: Block, depth: number, numberedIndex: number): string {
  const indent = "  ".repeat(depth);
  const text = inlineToMarkdown(block.content);
  let line: string;
  switch (block.type) {
    case "heading":
      line = `${"#".repeat(Number(block.props.level) || 1)} ${text}`;
      break;
    case "bulletListItem":
      line = `- ${text}`;
      break;
    case "numberedListItem":
      line = `${numberedIndex}. ${text}`;
      break;
    case "checkListItem":
      line = `- [${block.props.checked ? "x" : " "}] ${text}`;
      break;
    case "quote":
      line = `> ${text}`;
      break;
    case "codeBlock":
      line = `\`\`\`${block.props.language || ""}\n${text}\n\`\`\``;
      break;
    case "divider":
      line = "---";
      break;
    case "image":
      line = `![${block.props.caption || ""}](${block.props.url || ""})`;
      break;
    default:
      line = text;
  }
  let out = indent + line;
  if (block.children.length) out += "\n" + blocksToMarkdown(block.children, depth + 1);
  return out;
}

export function blocksToMarkdown(blocks: Block[], depth = 0): string {
  let n = 0;
  return blocks
    .map((b) => {
      if (b.type === "numberedListItem") n += 1;
      else n = 0;
      return blockToMarkdown(b, depth, n);
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
