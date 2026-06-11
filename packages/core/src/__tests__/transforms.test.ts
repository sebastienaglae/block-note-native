import { describe, expect, it } from "vitest";
import {
  changeBlockType,
  indentBlock,
  isListType,
  mergeWithPrevious,
  outdentBlock,
  splitBlock,
} from "../editor/transforms";
import { normalizeDocument } from "../model/normalize";
import { defaultBlockSpecs } from "../schema/blockSchema";
import { flattenBlocks } from "../model/tree";
import { inlineToString } from "../util/inline";
import type { PartialBlock } from "../model/types";

const schema = defaultBlockSpecs;
const doc = (partials: PartialBlock[]) => normalizeDocument(partials, schema);

describe("transforms (pure)", () => {
  it("isListType recognizes list blocks only", () => {
    expect(isListType("bulletListItem")).toBe(true);
    expect(isListType("numberedListItem")).toBe(true);
    expect(isListType("checkListItem")).toBe(true);
    expect(isListType("paragraph")).toBe(false);
    expect(isListType("heading")).toBe(false);
  });

  it("splitBlock splits content and a heading continues as a paragraph", () => {
    const d = doc([{ type: "heading", props: { level: 1 }, content: "Hello" }]);
    const res = splitBlock(d, schema, d[0].id, 2);
    expect(res.document).toHaveLength(2);
    expect(inlineToString(res.document[0].content)).toBe("He");
    expect(inlineToString(res.document[1].content)).toBe("llo");
    expect(res.document[1].type).toBe("paragraph");
    expect(res.selection).toMatchObject({ blockId: res.document[1].id, start: 0 });
  });

  it("mergeWithPrevious concatenates into the previous block", () => {
    const d = doc([
      { type: "paragraph", content: "Foo" },
      { type: "paragraph", content: "Bar" },
    ]);
    const res = mergeWithPrevious(d, d[1].id);
    expect(res).not.toBeNull();
    expect(res!.document).toHaveLength(1);
    expect(inlineToString(res!.document[0].content)).toBe("FooBar");
    expect(res!.selection).toMatchObject({ start: 3 });
  });

  it("mergeWithPrevious returns null for the first block", () => {
    const d = doc([{ type: "paragraph", content: "Only" }]);
    expect(mergeWithPrevious(d, d[0].id)).toBeNull();
  });

  it("indentBlock nests under the previous sibling, outdentBlock reverses it", () => {
    const d = doc([
      { type: "paragraph", content: "A" },
      { type: "paragraph", content: "B" },
    ]);
    const nested = indentBlock(d, d[1].id);
    expect(nested).toHaveLength(1);
    expect(nested[0].children).toHaveLength(1);
    expect(inlineToString(nested[0].children[0].content)).toBe("B");

    const flat = outdentBlock(nested, nested[0].children[0].id);
    expect(flat).toHaveLength(2);
    expect(flattenBlocks(flat).map((f) => inlineToString(f.block.content))).toEqual(["A", "B"]);
  });

  it("indentBlock is a no-op for the first sibling", () => {
    const d = doc([
      { type: "paragraph", content: "A" },
      { type: "paragraph", content: "B" },
    ]);
    expect(indentBlock(d, d[0].id)).toBe(d);
  });

  it("changeBlockType converts a list item to a paragraph with default props", () => {
    const d = doc([{ type: "checkListItem", props: { checked: true }, content: "task" }]);
    const out = changeBlockType(d, schema, d[0].id, "paragraph");
    expect(out[0].type).toBe("paragraph");
    expect(out[0].props.checked).toBeUndefined();
    expect(inlineToString(out[0].content)).toBe("task");
  });
});
