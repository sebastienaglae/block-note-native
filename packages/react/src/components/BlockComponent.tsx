import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import type { Block, Editor } from "@sebastienaglae/bnn-core";
import { useBnn } from "../context";
import { useDnd } from "../dnd/DndContext";
import { useCommentsOptional } from "../comments/CommentsContext";
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
}

export function BlockComponent({ block, editor, depth, listIndex }: BlockComponentProps): JSX.Element {
  const { theme, blockRenderers, inlineRenderers, setLayout, onOpenPage } = useBnn();
  const t = useT();
  const dnd = useDnd();
  const comments = useCommentsOptional();
  const [hover, setHover] = useState(false);
  const commentCount = comments ? editor.getComments(block.id).length : 0;

  const sel = editor.selection;
  const isSelected = sel?.blockId === block.id;
  const renderer = blockRenderers[block.type] ?? blockRenderers.paragraph;
  const isToggle = block.type === "toggleListItem" || block.type === "toggleHeading";
  const collapsed = isToggle && !!block.props.collapsed;

  const visible = !editor.locked && (Platform.OS === "web" ? hover || isSelected : true);
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
        <SideMenu block={block} editor={editor} theme={theme} visible={visible} draggable={depth === 0 && !editor.locked} />
        <View style={{ flex: 1, paddingVertical: 1 }}>{renderer(renderProps)}</View>
        {comments && (commentCount > 0 || (hover && !editor.locked)) ? (
          <Pressable
            onPress={() => comments.openComments(block.id)}
            style={({ hovered }: { hovered?: boolean }) => ({
              flexDirection: "row",
              alignItems: "center",
              marginLeft: 4,
              paddingHorizontal: 6,
              height: 24,
              borderRadius: 5,
              backgroundColor:
                commentCount > 0 ? theme.colors.accentSoft : hovered ? theme.colors.menuHover : "transparent",
            })}
            accessibilityLabel="Comments"
          >
            <Icon name="comment" size={14} color={commentCount > 0 ? theme.colors.accent : theme.colors.textSecondary} />
            {commentCount > 0 ? (
              <Text style={{ fontSize: 11, color: theme.colors.accent, marginLeft: 3, fontWeight: "600" }}>
                {commentCount}
              </Text>
            ) : null}
          </Pressable>
        ) : null}
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
              />
            );
          })}
        </View>
      ) : null}

      {isDropTarget && dnd.state.placement === "after" ? dropLine : null}
    </View>
  );
}
