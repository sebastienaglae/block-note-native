import type { Editor } from "@bnn/core";
import type { SlashMenuItem } from "../types";

function transform(editor: Editor, blockId: string, type: string, props?: Record<string, unknown>) {
  editor.updateBlock(blockId, { type, props });
  editor.setSelection({ blockId, start: 0, end: 0 });
}

export const defaultSlashItems: SlashMenuItem[] = [
  {
    key: "paragraph",
    title: "Text",
    subtitle: "Plain paragraph",
    icon: "¶",
    group: "Basic blocks",
    aliases: ["text", "paragraph", "p"],
    execute: (e, id) => transform(e, id, "paragraph"),
  },
  {
    key: "heading1",
    title: "Heading 1",
    subtitle: "Big section heading",
    icon: "H₁",
    group: "Basic blocks",
    aliases: ["h1", "heading", "title"],
    execute: (e, id) => transform(e, id, "heading", { level: 1 }),
  },
  {
    key: "heading2",
    title: "Heading 2",
    subtitle: "Medium heading",
    icon: "H₂",
    group: "Basic blocks",
    aliases: ["h2", "subheading"],
    execute: (e, id) => transform(e, id, "heading", { level: 2 }),
  },
  {
    key: "heading3",
    title: "Heading 3",
    subtitle: "Small heading",
    icon: "H₃",
    group: "Basic blocks",
    aliases: ["h3"],
    execute: (e, id) => transform(e, id, "heading", { level: 3 }),
  },
  {
    key: "bulletListItem",
    title: "Bulleted list",
    subtitle: "Simple bulleted list",
    icon: "•",
    group: "Lists",
    aliases: ["bullet", "unordered", "ul", "list"],
    execute: (e, id) => transform(e, id, "bulletListItem"),
  },
  {
    key: "numberedListItem",
    title: "Numbered list",
    subtitle: "Ordered list",
    icon: "1.",
    group: "Lists",
    aliases: ["numbered", "ordered", "ol"],
    execute: (e, id) => transform(e, id, "numberedListItem"),
  },
  {
    key: "checkListItem",
    title: "To-do list",
    subtitle: "Checkbox list",
    icon: "☑",
    group: "Lists",
    aliases: ["todo", "task", "checkbox", "check"],
    execute: (e, id) => transform(e, id, "checkListItem", { checked: false }),
  },
  {
    key: "quote",
    title: "Quote",
    subtitle: "Capture a quotation",
    icon: "❝",
    group: "Basic blocks",
    aliases: ["quote", "blockquote"],
    execute: (e, id) => transform(e, id, "quote"),
  },
  {
    key: "codeBlock",
    title: "Code",
    subtitle: "Code snippet",
    icon: "</>",
    group: "Advanced",
    aliases: ["code", "snippet", "pre"],
    execute: (e, id) => transform(e, id, "codeBlock", { language: "text" }),
  },
  {
    key: "divider",
    title: "Divider",
    subtitle: "Visual separator",
    icon: "─",
    group: "Advanced",
    aliases: ["divider", "hr", "rule", "separator"],
    execute: (e, id) => {
      e.updateBlock(id, { type: "divider" });
      const [inserted] = e.insertBlocks([{ type: "paragraph" }], id, "after");
      e.setSelection({ blockId: inserted.id, start: 0, end: 0 });
    },
  },
  {
    key: "image",
    title: "Image",
    subtitle: "Embed an image by URL",
    icon: "🖼",
    group: "Advanced",
    aliases: ["image", "img", "picture", "photo"],
    execute: (e, id) => transform(e, id, "image"),
  },
];
