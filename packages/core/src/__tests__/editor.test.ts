import { describe, expect, it } from "vitest";
import { Editor } from "../editor/Editor";
import { flattenBlocks } from "../model/tree";
import { inlineToString } from "../util/inline";

function makeEditor() {
  return new Editor({
    initialContent: [
      { type: "paragraph", content: "First" },
      { type: "paragraph", content: "Second" },
    ],
  });
}

describe("Editor", () => {
  it("normalizes initial content", () => {
    const editor = makeEditor();
    expect(editor.document).toHaveLength(2);
    expect(editor.document[0].type).toBe("paragraph");
    expect(inlineToString(editor.document[0].content)).toBe("First");
  });

  it("splits a block at the caret (Enter)", () => {
    const editor = makeEditor();
    const id = editor.document[0].id;
    editor.setSelection({ blockId: id, start: 2, end: 2 });
    editor.splitAtSelection();
    expect(editor.document).toHaveLength(3);
    expect(inlineToString(editor.document[0].content)).toBe("Fi");
    expect(inlineToString(editor.document[1].content)).toBe("rst");
  });

  it("merges into previous block (Backspace at start)", () => {
    const editor = makeEditor();
    const second = editor.document[1].id;
    editor.setSelection({ blockId: second, start: 0, end: 0 });
    const handled = editor.mergeBackward(second);
    expect(handled).toBe(true);
    expect(editor.document).toHaveLength(1);
    expect(inlineToString(editor.document[0].content)).toBe("FirstSecond");
    expect(editor.selection).toMatchObject({ start: 5 });
  });

  it("nests and unnests blocks (Tab / Shift-Tab)", () => {
    const editor = makeEditor();
    const second = editor.document[1].id;
    editor.nestBlock(second);
    expect(editor.document).toHaveLength(1);
    expect(editor.document[0].children).toHaveLength(1);
    expect(editor.document[0].children[0].id).toBe(second);

    editor.unnestBlock(second);
    expect(editor.document).toHaveLength(2);
    expect(editor.document[0].children).toHaveLength(0);
  });

  it("changes block type and applies styles via selection", () => {
    const editor = makeEditor();
    const id = editor.document[0].id;
    editor.updateBlock(id, { type: "heading", props: { level: 2 } });
    expect(editor.document[0].type).toBe("heading");
    expect(editor.document[0].props.level).toBe(2);

    editor.setSelection({ blockId: id, start: 0, end: 5 });
    editor.toggleStyles({ bold: true });
    expect(editor.document[0].content?.[0]).toMatchObject({ styles: { bold: true } });
    expect(editor.getActiveStyles().bold).toBe(true);
  });

  it("supports undo / redo", () => {
    const editor = makeEditor();
    const id = editor.document[0].id;
    editor.updateBlock(id, { type: "heading" });
    expect(editor.document[0].type).toBe("heading");
    editor.undo();
    expect(editor.document[0].type).toBe("paragraph");
    editor.redo();
    expect(editor.document[0].type).toBe("heading");
  });

  it("empty list item exits the list on Enter", () => {
    const editor = new Editor({ initialContent: [{ type: "bulletListItem", content: "" }] });
    const id = editor.document[0].id;
    editor.setSelection({ blockId: id, start: 0, end: 0 });
    editor.splitAtSelection();
    expect(editor.document[0].type).toBe("paragraph");
  });

  it("moves blocks and prevents dropping into own subtree", () => {
    const editor = makeEditor();
    const [a, b] = editor.document.map((x) => x.id);
    editor.nestBlock(b); // b becomes child of a
    editor.moveBlock(a, b, "after"); // illegal: b is inside a
    // a should still contain b
    const flat = flattenBlocks(editor.document);
    expect(flat[0].block.id).toBe(a);
    expect(flat[1].block.id).toBe(b);
  });
});
