import { describe, expect, it } from "vitest";
import { Editor } from "../editor/Editor";
import { blocksToMarkdown, markdownToBlocks } from "../markdown/serialize";
import { matchMarkdownInput } from "../commands/markdownInput";

describe("markdown", () => {
  it("serializes blocks to markdown", () => {
    const editor = new Editor({
      initialContent: [
        { type: "heading", props: { level: 1 }, content: "Title" },
        { type: "paragraph", content: [{ type: "text", text: "bold", styles: { bold: true } }] },
        { type: "bulletListItem", content: "item" },
        { type: "checkListItem", props: { checked: true }, content: "done" },
      ],
    });
    const md = blocksToMarkdown(editor.document);
    expect(md).toContain("# Title");
    expect(md).toContain("**bold**");
    expect(md).toContain("- item");
    expect(md).toContain("- [x] done");
  });

  it("round-trips markdown -> blocks -> markdown", () => {
    const md = ["# Heading", "", "Some **bold** and *italic*.", "", "- one", "- two"].join("\n");
    const blocks = markdownToBlocks(md);
    const editor = new Editor({ initialContent: blocks });
    const out = blocksToMarkdown(editor.document);
    expect(out).toContain("# Heading");
    expect(out).toContain("**bold**");
    expect(out).toContain("- one");
    expect(out).toContain("- two");
  });

  it("matches markdown input rules", () => {
    expect(matchMarkdownInput("# ")).toMatchObject({ type: "heading", props: { level: 1 } });
    expect(matchMarkdownInput("### ")).toMatchObject({ type: "heading", props: { level: 3 } });
    expect(matchMarkdownInput("- ")).toMatchObject({ type: "bulletListItem" });
    expect(matchMarkdownInput("1. ")).toMatchObject({ type: "numberedListItem" });
    expect(matchMarkdownInput("[] ")).toMatchObject({ type: "checkListItem", props: { checked: false } });
    expect(matchMarkdownInput("[x] ")).toMatchObject({ type: "checkListItem", props: { checked: true } });
    expect(matchMarkdownInput("> ")).toMatchObject({ type: "quote" });
    expect(matchMarkdownInput("---")).toMatchObject({ type: "divider", void: true });
    expect(matchMarkdownInput("hello")).toBeNull();
  });
});
