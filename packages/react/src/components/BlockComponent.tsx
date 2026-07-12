import { useState } from "react";
import { Platform, Pressable, View } from "react-native";
import type { Block, Editor } from "@sebastienaglae/bnn-core";
import { useBnn } from "../context";
import { useDnd } from "../dnd/DndContext";
import { useT } from "../i18n/I18nContext";
import { Icon } from "../icons/Icon";
import { SideMenu } from "../ui/SideMenu";
import { BlockContent } from "./BlockContent";
import type { BlockRenderProps, BlockTextStyle } from "../types";

const INDENT = 26;

export interface BlockComponentProps {
  block: Block;
  editor: Editor;
  depth: number;
  listIndex?: number;
  disableSideMenu?: boolean;
}

export function BlockComponent({ block, editor, depth, listIndex, disableSideMenu }: BlockComponentProps): JSX.Element {
  const { theme, blockRenderers, inlineRenderers, setLayout, onOpenPage } = useBnn();
  const t = useT();
  const dnd = useDnd();
  const [hover, setHover] = useState(false);

  const sel = editor.selection;
  const isSelected = sel?.blockId === block.id;
  const renderer = blockRenderers[block.type] ?? blockRenderers.paragraph;
  const isToggle = block.type === "toggleListItem" || block.type === "toggleHeading";
  const collapsed = isToggle && !!block.props.collapsed;

  const visible = !editor.locked && (Platform.OS === "web" ? hover || isSelected : true);
  // Void blocks (image/video/audio/file/bookmark/map/table/divider + custom void
  // blocks) have no editable text, so they can't be removed by emptying + Backspace
  // the way text blocks can — they get an explicit hover delete button instead.
  const isVoid = block.content === undefined;
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
    isReadOnly: editor.locked,
    readonly: editor.locked,
    listIndex,
    InlineContentView,
    onOpenPage,
    t,
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
        {!disableSideMenu ? <SideMenu block={block} editor={editor} theme={theme} visible={visible} draggable={depth === 0 && !editor.locked} /> : null}
        <View pointerEvents={editor.locked ? "none" : "auto"} style={{ flex: 1, paddingVertical: 1 }}>
          {renderer(renderProps)}
          {/* Hover delete — only for void blocks, which can't be emptied + Backspaced. */}
          {visible && isVoid ? (
            <Pressable
              onPress={() => editor.removeBlocks([block.id])}
              accessibilityLabel={t("bnn.block.delete", "Delete")}
              style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => ({
                position: "absolute",
                top: 2,
                right: 2,
                width: 24,
                height: 24,
                borderRadius: 6,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: theme.colors.border,
                backgroundColor: pressed || hovered ? theme.colors.menuHover : theme.colors.menuBackground,
                opacity: hovered || pressed ? 1 : 0.85,
                cursor: "pointer",
                zIndex: 20,
              })}
            >
              <Icon name="trash" size={14} color="#e5484d" />
            </Pressable>
          ) : null}
        </View>
      </View>

      {block.children.length > 0 && !collapsed ? (
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
                disableSideMenu={disableSideMenu}
              />
            );
          })}
        </View>
      ) : null}

      {isDropTarget && dnd.state.placement === "after" ? dropLine : null}
    </View>
  );
}
