import type { Block, InlineContent } from "./model/types";
import type { BlockSchema } from "./schema/blockSchema";
import type { InlineSchema } from "./schema/inlineSchema";

export interface ValidationIssue {
  path: string;
  message: string;
}

export interface ValidationOptions {
  blockSchema?: BlockSchema;
  inlineSchema?: InlineSchema;
}

/** Checks a document against the editor schema without mutating it. */
export function validateDocument(document: Block[], options: ValidationOptions = {}): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const blockSchema = options.blockSchema;
  const checkInline = (content: InlineContent[] | undefined, path: string) => {
    if (!content) return;
    content.forEach((inline, index) => {
      if (inline.type === "text" && typeof (inline as { text?: unknown }).text !== "string") issues.push({ path: `${path}.${index}`, message: "Text content must have a string text value." });
      if (inline.type !== "text" && options.inlineSchema && !options.inlineSchema[inline.type]) issues.push({ path: `${path}.${index}.type`, message: `Unknown inline content type: ${inline.type}.` });
    });
  };
  const visit = (block: Block, path: string) => {
    const spec = blockSchema?.[block.type];
    if (blockSchema && !spec) issues.push({ path: `${path}.type`, message: `Unknown block type: ${block.type}.` });
    if (spec) {
      if (spec.content === "inline" && block.content === undefined) issues.push({ path: `${path}.content`, message: "Inline blocks must have content." });
      if (spec.content === "none" && block.content !== undefined) issues.push({ path: `${path}.content`, message: "Void blocks cannot have inline content." });
      for (const [key, prop] of Object.entries(spec.propSchema)) if (!(key in block.props)) issues.push({ path: `${path}.props.${key}`, message: "Missing required property." });
    }
    checkInline(block.content, `${path}.content`);
    block.children.forEach((child, index) => visit(child, `${path}.children.${index}`));
  };
  document.forEach((block, index) => visit(block, `blocks.${index}`));
  return issues;
}

export function isValidDocument(document: Block[], options?: ValidationOptions): boolean {
  return validateDocument(document, options).length === 0;
}
