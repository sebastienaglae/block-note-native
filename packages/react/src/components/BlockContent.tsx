import {
  icText,
  inlineLength,
  inlineToString,
  matchMarkdownInput,
  sliceInline,
  type Block,
  type CustomInlineContent,
  type Editor,
  type InlineContent,
} from "@sebastienaglae/bnn-core";
import { Text } from "react-native";
import type { BlockTextStyle, EditableSelection, InlineRenderer } from "../types";
import type { Theme } from "../theme/theme";
import { RichTextInput } from "../editable/RichTextInput";
import { useT } from "../i18n/I18nContext";
import { enLabels, type LabelKey } from "../i18n/labels";

export interface BlockContentProps {
  block: Block;
  editor: Editor;
  theme: Theme;
  active: boolean;
  selection: EditableSelection | null;
  textStyle?: BlockTextStyle;
  placeholder?: string;
  inlineRenderers: Record<string, InlineRenderer>;
}

export function BlockContent(props: BlockContentProps): JSX.Element {
  const { block, editor, theme, active, selection, textStyle, placeholder, inlineRenderers } = props;
  const t = useT();
  // `placeholder` may be an i18n key (default blocks) or a raw string (custom blocks).
  // Use the English catalog as the fallback so default blocks read correctly even
  // when no translate function is supplied (otherwise the raw key would show).
  const resolvedPlaceholder = placeholder
    ? t(placeholder, enLabels[placeholder as LabelKey] ?? placeholder)
    : undefined;
  const content = block.content ?? [];

  const renderCustomInline = (ic: CustomInlineContent) => {
    const R = inlineRenderers[ic.type];
    if (R) return R({ inlineContent: ic, editor, theme });
    return <Text style={{ color: theme.colors.textSecondary }}>{icText(ic)}</Text>;
  };

  const handleChange = (newContent: InlineContent[], sel: EditableSelection) => {
    // Markdown input rules only fire while the block is a plain paragraph.
    if (block.type === "paragraph") {
      const plain = inlineToString(newContent);
      const rule = matchMarkdownInput(plain);
      if (rule) {
        if (rule.void) {
          editor.updateBlock(block.id, { type: rule.type, props: rule.props });
          const [inserted] = editor.insertBlocks([{ type: "paragraph" }], block.id, "after");
          editor.setSelection({ blockId: inserted.id, start: 0, end: 0 });
          return;
        }
        const stripped = sliceInline(newContent, rule.stripLength, inlineLength(newContent));
        editor.updateBlock(block.id, { type: rule.type, props: rule.props, content: stripped });
        const caret = Math.max(0, sel.start - rule.stripLength);
        editor.setSelection({ blockId: block.id, start: caret, end: caret });
        return;
      }
    }
    editor.setBlockContent(block.id, newContent, {
      blockId: block.id,
      start: sel.start,
      end: sel.end,
    });
  };

  return (
    <RichTextInput
      blockId={block.id}
      content={content}
      active={active}
      selection={selection}
      placeholder={resolvedPlaceholder}
      editable={!editor.locked}
      textStyle={textStyle}
      theme={theme}
      renderCustomInline={renderCustomInline}
      onChange={handleChange}
      onSelectionChange={(sel) =>
        editor.setSelection({ blockId: block.id, start: sel.start, end: sel.end })
      }
      onEnter={(offset) => {
        editor.setSelection({ blockId: block.id, start: offset, end: offset });
        editor.splitAtSelection();
      }}
      onBackspaceAtStart={() => editor.mergeBackward(block.id)}
      onDeleteAtEnd={() => editor.deleteForward(block.id)}
      onTab={(shift) => (shift ? editor.unnestBlock(block.id) : editor.nestBlock(block.id))}
      onArrowOut={(dir) => {
        const target = dir === "up" ? editor.getPrevBlock(block.id) : editor.getNextBlock(block.id);
        if (target && target.content !== undefined) {
          const caret = dir === "up" ? inlineLength(target.content) : 0;
          editor.setSelection({ blockId: target.id, start: caret, end: caret });
        }
      }}
    />
  );
}
