import { describe, expect, it } from "vitest";
import { createBlockSchema, createInlineSchema, normalizeBlock } from "../index";
import { validateDocument, isValidDocument } from "../validation";

describe("document validation", () => {
  const schema = createBlockSchema();
  const inlineSchema = createInlineSchema();

  it("accepts normalized valid content", () => {
    const block = normalizeBlock({ type: "paragraph", content: "Hello" }, schema);
    expect(isValidDocument([block], { blockSchema: schema, inlineSchema })).toBe(true);
  });

  it("reports unknown blocks and invalid content kind", () => {
    const block = { id: "x", type: "missing", props: {}, content: [], children: [] } as never;
    const issues = validateDocument([block], { blockSchema: schema, inlineSchema });
    expect(issues.map((issue) => issue.path)).toContain("blocks.0.type");
  });
});
