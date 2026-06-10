import { useState } from "react";
import { Platform, View } from "react-native";
import type { Block, Editor } from "@bnn/core";
import { useBnn } from "../context";
import { useDnd } from "../dnd/DndContext";
import { SideMenu } from "../ui/SideMenu";
import { BlockContent } from "./BlockContent";
import type { BlockRenderProps, BlockTextStyle } from "../types";

const INDENT = 26;

export interface BlockComponentProps {
  block: Block;
  editor: Editor;
  depth: number;
  listIndex?: number;
}

export function BlockComponent({ block, editor, depth, listIndex }: BlockComponentProps): JSX.Element {
  const { theme, blockRenderers, inlineRenderers, setLayout } = useBnn();
  const dnd = useDnd();
  const [hover, setHover] = useState(false);

  const sel = editor.selection;
  const isSelected = sel?.blockId === block.id;
  const renderer = blockRenderers[block.type] ?? blockRenderers.paragraph;

  const visible = Platform.OS === "web" ? hover || isSelected : true;
  const isDropTarget = depth === 0 && dnd.state.draggingId !== null && dnd.state.targetId === block.id;
  const isDragging = dnd.state.draggingId === block.id;

  const InlineContentView = (opts?: { textStyle?: BlockTextStyle; placeholder?: string }) => (
    <BlockContent
      block={block}
      editor={editor}
      theme={theme}
      active={isSelected}
      selection={isSelected && sel ? { start: sel.start, end: sel.end } : null}
      textStyle={opts?.textStyle}
      placeholder={opts?.placeholder}
      inlineRenderers={inlineRenderers}
    />
  );

  const renderProps: BlockRenderProps = {
    block,
    editor,
    theme,
    isSelected,
    listIndex,
    InlineContentView,
  };

  const hoverProps =
    Platform.OS === "web"
      ? { onMouseEnter: () => setHover(true), onMouseLeave: () => setHover(false) }
      : {};

  const dropLine = (
    <View
      style={{
        height: 2,
        borderRadius: 1,
        backgroundColor: theme.colors.accent,
        marginLeft: 48,
        marginVertical: 1,
      }}
    />
  );

  // Compute ordinals for numbered children.
  let counter = 0;

  return (
    <View
      onLayout={depth === 0 ? (e) => setLayout(block.id, e.nativeEvent.layout) : undefined}
      {...(hoverProps as object)}
      style={{ opacity: isDragging ? 0.4 : 1 }}
    >
      {isDropTarget && dnd.state.placement === "before" ? dropLine : null}
      <View style={{ flexDirection: "row", alignItems: "flex-start", paddingVertical: 2 }}>
        <SideMenu block={block} editor={editor} theme={theme} visible={visible} draggable={depth === 0} />
        <View style={{ flex: 1, paddingVertical: 1 }}>{renderer(renderProps)}</View>
      </View>

      {block.children.length > 0 ? (
        <View style={{ paddingLeft: INDENT }}>
          {block.children.map((child) => {
            const childIndex = child.type === "numberedListItem" ? ++counter : (counter = 0);
            return (
              <BlockComponent
                key={child.id}
                block={child}
                editor={editor}
                depth={depth + 1}
                listIndex={child.type === "numberedListItem" ? childIndex : undefined}
              />
            );
          })}
        </View>
      ) : null}

      {isDropTarget && dnd.state.placement === "after" ? dropLine : null}
    </View>
  );
}
