import { useState } from "react";
import { Platform, Pressable, View } from "react-native";
import type { Editor } from "@sebastienaglae/bnn-core";
import type { Theme } from "../theme/theme";
import { useDnd } from "../dnd/DndContext";
import { Icon } from "../icons/Icon";
import { useT } from "../i18n/I18nContext";

export interface SideMenuProps {
  block: { id: string };
  editor: Editor;
  theme: Theme;
  visible: boolean;
  draggable: boolean;
}

const HANDLE = 26;

export function SideMenu({ block, editor, theme, visible, draggable }: SideMenuProps): JSX.Element {
  const dnd = useDnd();
  const t = useT();
  const [dragHover, setDragHover] = useState(false);

  const webHover =
    Platform.OS === "web"
      ? { onMouseEnter: () => setDragHover(true), onMouseLeave: () => setDragHover(false) }
      : {};

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        opacity: visible ? 1 : 0,
        width: 2 * HANDLE + 6,
        justifyContent: "flex-end",
        paddingTop: 1,
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <Pressable
        onPress={() => {
          const [inserted] = editor.insertBlocks([{ type: "paragraph" }], block.id, "after");
          editor.setSelection({ blockId: inserted.id, start: 0, end: 0 });
        }}
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => ({
          width: HANDLE,
          height: HANDLE,
          borderRadius: 5,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: pressed || hovered ? theme.colors.menuHover : "transparent",
          cursor: "pointer",
        })}
        accessibilityLabel={t("bnn.side.add", "Add block below")}
      >
        <Icon name="add" size={18} color={theme.colors.textSecondary} />
      </Pressable>
      <View
        {...(draggable ? dnd.handleProps(block.id) : {})}
        {...(draggable ? webHover : {})}
        // Stop a drag-start from beginning a text selection.
        {...(draggable && Platform.OS === "web"
          ? { onMouseDown: (e: { preventDefault: () => void }) => e.preventDefault() }
          : {})}
        style={{
          width: HANDLE,
          height: HANDLE,
          borderRadius: 5,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: draggable && dragHover ? theme.colors.menuHover : "transparent",
          cursor: draggable ? "grab" : "default",
        }}
        accessibilityLabel={t("bnn.side.drag", "Drag to reorder")}
      >
        <Icon name="drag" size={15} color={theme.colors.textSecondary} />
      </View>
    </View>
  );
}
