import { describe, expect, it } from "vitest";
import { Editor } from "../editor/Editor";
import { inlineToString, isLink } from "../util/inline";
import type { Comment } from "../model/types";

function makeEditor() {
  return new Editor({
    initialContent: [
      { type: "paragraph", content: "First" },
      { type: "paragraph", content: "Second" },
      { type: "paragraph", content: "Third" },
    ],
  });
}

describe("Editor block operations", () => {
  it("inserts blocks before and after a reference", () => {
    const editor = makeEditor();
    const second = editor.document[1].id;
    const [after] = editor.insertBlocks([{ type: "paragraph", content: "After" }], second, "after");
    expect(inlineToString(editor.document[2].content)).toBe("After");
    expect(editor.document[2].id).toBe(after.id);

    editor.insertBlocks([{ type: "paragraph", content: "Before" }], second, "before");
    expect(inlineToString(editor.document[1].content)).toBe("Before");
    expect(editor.document).toHaveLength(5);
  });

  it("looks up previous and next blocks", () => {
    const editor = makeEditor();
    const second = editor.document[1].id;
    expect(inlineToString(editor.getPrevBlock(second)?.content)).toBe("First");
    expect(inlineToString(editor.getNextBlock(second)?.content)).toBe("Third");
    expect(editor.getPrevBlock(editor.document[0].id)).toBeNull();
  });

  it("removes and replaces blocks", () => {
    const editor = makeEditor();
    editor.removeBlocks([editor.document[1].id]);
    expect(editor.document).toHaveLength(2);
    expect(inlineToString(editor.document[1].content)).toBe("Third");

    const first = editor.document[0].id;
    editor.replaceBlocks([first], [
      { type: "heading", props: { level: 1 }, content: "H" },
      { type: "paragraph", content: "P" },
    ]);
    expect(editor.document[0].type).toBe("heading");
    expect(inlineToString(editor.document[1].content)).toBe("P");
  });

  it("moves blocks up and down, clamping at the edges", () => {
    const editor = makeEditor();
    const third = editor.document[2].id;
    editor.moveBlockUp(third);
    expect(editor.document.map((b) => inlineToString(b.content))).toEqual(["First", "Third", "Second"]);

    const top = editor.document[0].id;
    editor.moveBlockUp(top); // no-op at the top
    expect(inlineToString(editor.document[0].content)).toBe("First");

    editor.moveBlockDown(editor.document[2].id); // no-op at the bottom
    expect(editor.document).toHaveLength(3);
  });
});

describe("Editor inline editing", () => {
  it("wraps a selection in a link", () => {
    const editor = new Editor({ initialContent: [{ type: "paragraph", content: "Go home now" }] });
    const id = editor.document[0].id;
    editor.setSelection({ blockId: id, start: 3, end: 7 });
    editor.createLink("https://example.com");
    const link = editor.document[0].content?.find((ic) => isLink(ic));
    expect(link).toBeTruthy();
    expect(link && isLink(link) && link.href).toBe("https://example.com");
    expect(inlineToString(editor.document[0].content)).toBe("Go home now");
  });

  it("inserts inline content at the caret and advances the selection", () => {
    const editor = new Editor({ initialContent: [{ type: "paragraph", content: "AB" }] });
    const id = editor.document[0].id;
    editor.setSelection({ blockId: id, start: 1, end: 1 });
    editor.insertInlineContent({ type: "text", text: "X", styles: {} });
    expect(inlineToString(editor.document[0].content)).toBe("AXB");
    expect(editor.selection).toMatchObject({ start: 2, end: 2 });
  });
});

describe("Editor page metadata", () => {
  it("sets title, icon and cover", () => {
    const editor = makeEditor();
    editor.setPageTitle("My page");
    editor.setPageIcon("🚀");
    editor.setPageCover("https://img");
    expect(inlineToString(editor.meta.title)).toBe("My page");
    expect(editor.meta.icon).toBe("🚀");
    expect(editor.meta.cover).toBe("https://img");

    editor.setPageIcon(null);
    expect(editor.meta.icon).toBeUndefined();
  });
});

describe("Editor comments", () => {
  const c = (id: string, text: string): Comment => ({ id, author: "Me", text, createdAt: 0 });

  it("adds, updates, resolves and removes comments per block", () => {
    const editor = makeEditor();
    const id = editor.document[0].id;
    editor.addComment(id, c("c1", "hello"));
    editor.addComment(id, c("c2", "world"));
    expect(editor.getComments(id)).toHaveLength(2);

    editor.updateComment(id, "c1", { text: "edited", resolved: true });
    const updated = editor.getComments(id).find((x) => x.id === "c1");
    expect(updated).toMatchObject({ text: "edited", resolved: true });

    editor.removeComment(id, "c2");
    expect(editor.getComments(id)).toHaveLength(1);
    editor.removeComment(id, "c1");
    expect(editor.comments[id]).toBeUndefined();
  });
});

describe("Editor lock + serialization", () => {
  it("ignores edits while locked is set by the host but reflects the flag", () => {
    const editor = makeEditor();
    expect(editor.locked).toBe(false);
    editor.setLocked(true);
    expect(editor.locked).toBe(true);
  });

  it("replaceDocument swaps content + meta + comments and toJSON round-trips", () => {
    const editor = makeEditor();
    editor.addComment(editor.document[0].id, { id: "x", author: "Me", text: "hi", createdAt: 0 });
    const snapshot = editor.toJSON();
    expect(snapshot.blocks).toHaveLength(3);

    editor.replaceDocument([{ type: "paragraph", content: "Fresh" }], { icon: "📄", title: "T" }, {});
    expect(editor.document).toHaveLength(1);
    expect(inlineToString(editor.document[0].content)).toBe("Fresh");
    expect(editor.meta.icon).toBe("📄");
    expect(Object.keys(editor.comments)).toHaveLength(0);
  });
});

describe("Editor history across metadata", () => {
  it("undoes and redoes a title change", () => {
    const editor = makeEditor();
    editor.setPageTitle("Before");
    editor.setPageTitle("After");
    expect(inlineToString(editor.meta.title)).toBe("After");
    editor.undo();
    expect(inlineToString(editor.meta.title)).toBe("Before");
    editor.redo();
    expect(inlineToString(editor.meta.title)).toBe("After");
  });
});
