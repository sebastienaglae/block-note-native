import type { Editor } from "@sebastienaglae/bnn-core";
import type { SlashMenuItem } from "../types";

function transform(editor: Editor, blockId: string, type: string, props?: Record<string, unknown>) {
  editor.updateBlock(blockId, { type, props });
  editor.setSelection({ blockId, start: 0, end: 0 });
}

const GROUP_BASIC = "Basic blocks";
const GROUP_LISTS = "Lists";
const GROUP_MEDIA = "Media";
const GROUP_ADVANCED = "Advanced";
const GROUP_INLINE = "Inline";

export const defaultSlashItems: SlashMenuItem[] = [
  { key: "paragraph", title: "Text", subtitle: "Plain paragraph", titleKey: "bnn.block.text", subtitleKey: "bnn.block.text.sub", icon: "text", group: GROUP_BASIC, aliases: ["text", "paragraph", "p"], execute: (e, id) => transform(e, id, "paragraph") },
  { key: "heading1", title: "Heading 1", subtitle: "Big section heading", titleKey: "bnn.block.heading1", subtitleKey: "bnn.block.heading1.sub", icon: "h1", group: GROUP_BASIC, aliases: ["h1", "heading", "title"], execute: (e, id) => transform(e, id, "heading", { level: 1 }) },
  { key: "heading2", title: "Heading 2", subtitle: "Medium heading", titleKey: "bnn.block.heading2", subtitleKey: "bnn.block.heading2.sub", icon: "h2", group: GROUP_BASIC, aliases: ["h2", "subheading"], execute: (e, id) => transform(e, id, "heading", { level: 2 }) },
  { key: "heading3", title: "Heading 3", subtitle: "Small heading", titleKey: "bnn.block.heading3", subtitleKey: "bnn.block.heading3.sub", icon: "h3", group: GROUP_BASIC, aliases: ["h3"], execute: (e, id) => transform(e, id, "heading", { level: 3 }) },
  { key: "quote", title: "Quote", subtitle: "Capture a quotation", titleKey: "bnn.block.quote", subtitleKey: "bnn.block.quote.sub", icon: "quote", group: GROUP_BASIC, aliases: ["quote", "blockquote"], execute: (e, id) => transform(e, id, "quote") },

  { key: "bulletListItem", title: "Bulleted list", subtitle: "Simple bulleted list", titleKey: "bnn.block.bullet", subtitleKey: "bnn.block.bullet.sub", icon: "bulletList", group: GROUP_LISTS, aliases: ["bullet", "unordered", "ul", "list"], execute: (e, id) => transform(e, id, "bulletListItem") },
  { key: "numberedListItem", title: "Numbered list", subtitle: "Ordered list", titleKey: "bnn.block.numbered", subtitleKey: "bnn.block.numbered.sub", icon: "numberedList", group: GROUP_LISTS, aliases: ["numbered", "ordered", "ol"], execute: (e, id) => transform(e, id, "numberedListItem") },
  { key: "checkListItem", title: "To-do list", subtitle: "Checkbox list", titleKey: "bnn.block.todo", subtitleKey: "bnn.block.todo.sub", icon: "checkList", group: GROUP_LISTS, aliases: ["todo", "task", "checkbox", "check"], execute: (e, id) => transform(e, id, "checkListItem", { checked: false }) },
  { key: "toggleListItem", title: "Toggle list", subtitle: "Collapsible list", titleKey: "bnn.block.toggle", subtitleKey: "bnn.block.toggle.sub", icon: "toggle", group: GROUP_LISTS, aliases: ["toggle", "collapse", "fold"], execute: (e, id) => transform(e, id, "toggleListItem") },
  { key: "toggleHeading1", title: "Toggle heading 1", subtitle: "Collapsible heading", titleKey: "bnn.block.toggleH1", subtitleKey: "bnn.block.toggleH.sub", icon: "h1", group: GROUP_LISTS, aliases: ["toggle heading", "th1"], execute: (e, id) => transform(e, id, "toggleHeading", { level: 1 }) },
  { key: "toggleHeading2", title: "Toggle heading 2", subtitle: "Collapsible heading", titleKey: "bnn.block.toggleH2", subtitleKey: "bnn.block.toggleH.sub", icon: "h2", group: GROUP_LISTS, aliases: ["toggle heading", "th2"], execute: (e, id) => transform(e, id, "toggleHeading", { level: 2 }) },
  { key: "toggleHeading3", title: "Toggle heading 3", subtitle: "Collapsible heading", titleKey: "bnn.block.toggleH3", subtitleKey: "bnn.block.toggleH.sub", icon: "h3", group: GROUP_LISTS, aliases: ["toggle heading", "th3"], execute: (e, id) => transform(e, id, "toggleHeading", { level: 3 }) },

  { key: "image", title: "Image", subtitle: "Embed an image", titleKey: "bnn.block.image", subtitleKey: "bnn.block.image.sub", icon: "image", group: GROUP_MEDIA, aliases: ["image", "img", "picture", "photo"], execute: (e, id) => transform(e, id, "image") },
  { key: "video", title: "Video", subtitle: "YouTube, Vimeo or .mp4", titleKey: "bnn.block.video", subtitleKey: "bnn.block.video.sub", icon: "video", group: GROUP_MEDIA, aliases: ["video", "youtube", "vimeo", "movie"], execute: (e, id) => transform(e, id, "video") },
  { key: "audio", title: "Audio", subtitle: "Embed an audio file", titleKey: "bnn.block.audio", subtitleKey: "bnn.block.audio.sub", icon: "audio", group: GROUP_MEDIA, aliases: ["audio", "sound", "music", "mp3"], execute: (e, id) => transform(e, id, "audio") },
  { key: "file", title: "File", subtitle: "Attach a file", titleKey: "bnn.block.file", subtitleKey: "bnn.block.file.sub", icon: "file", group: GROUP_MEDIA, aliases: ["file", "attachment", "document", "pdf"], execute: (e, id) => transform(e, id, "file") },
  { key: "bookmark", title: "Web bookmark", subtitle: "Link preview card", titleKey: "bnn.block.bookmark", subtitleKey: "bnn.block.bookmark.sub", icon: "bookmark", group: GROUP_MEDIA, aliases: ["bookmark", "link preview", "embed", "url"], execute: (e, id) => transform(e, id, "bookmark") },
  { key: "mapView", title: "Map", subtitle: "Embed a location map", titleKey: "bnn.block.map", subtitleKey: "bnn.block.map.sub", icon: "map", group: GROUP_MEDIA, aliases: ["map", "location", "carte", "place", "openstreetmap"], execute: (e, id) => transform(e, id, "mapView") },

  { key: "divider", title: "Divider", subtitle: "Visual separator", titleKey: "bnn.block.divider", subtitleKey: "bnn.block.divider.sub", icon: "divider", group: GROUP_ADVANCED, aliases: ["divider", "hr", "rule", "separator"], execute: (e, id) => { e.updateBlock(id, { type: "divider" }); const [ins] = e.insertBlocks([{ type: "paragraph" }], id, "after"); e.setSelection({ blockId: ins.id, start: 0, end: 0 }); } },
  { key: "codeBlock", title: "Code", subtitle: "Code snippet", titleKey: "bnn.block.code", subtitleKey: "bnn.block.code.sub", icon: "code", group: GROUP_ADVANCED, aliases: ["code", "snippet", "pre"], execute: (e, id) => transform(e, id, "codeBlock", { language: "text" }) },
  { key: "table", title: "Table", subtitle: "Simple table", titleKey: "bnn.block.table", subtitleKey: "bnn.block.table.sub", icon: "table", group: GROUP_ADVANCED, aliases: ["table", "grid", "tableau"], execute: (e, id) => transform(e, id, "table") },
  { key: "pageLink", title: "Link to page", subtitle: "Reference another page", titleKey: "bnn.block.pageLink", subtitleKey: "bnn.block.pageLink.sub", icon: "pageLink", group: GROUP_ADVANCED, aliases: ["page", "link to page", "lien vers une page", "reference"], execute: (e, id) => transform(e, id, "pageLink") },

  { key: "emoji", title: "Emoji", subtitle: "Insert an emoji", titleKey: "bnn.block.emoji", subtitleKey: "bnn.block.emoji.sub", icon: "emoji", group: GROUP_INLINE, aliases: ["emoji", "emoticon", "smiley"], kind: "emoji", execute: () => undefined },
];
