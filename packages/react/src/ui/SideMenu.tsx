import { Pressable, Text, View } from "react-native";
import type { Editor } from "@bnn/core";
import type { Theme } from "../theme/theme";
import { useDnd } from "../dnd/DndContext";

export interface SideMenuProps {
  block: { id: string };
  editor: Editor;
  theme: Theme;
  visible: boolean;
  /** Only top-level blocks are draggable in this MVP. */
  draggable: boolean;
}

export function SideMenu({ block, editor, theme, visible, draggable }: SideMenuProps): JSX.Element {
  const dnd = useDnd();
  const opacity = visible ? 1 : 0;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        opacity,
        width: 48,
        justifyContent: "flex-end",
        paddingRight: 4,
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <Pressable
        onPress={() => {
          const [inserted] = editor.insertBlocks([{ type: "paragraph" }], block.id, "after");
          editor.setSelection({ blockId: inserted.id, start: 0, end: 0 });
        }}
        style={({ pressed }: { pressed: boolean }) => ({
          width: 22,
          height: 22,
          borderRadius: 4,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: pressed ? theme.colors.menuHover : "transparent",
        })}
        accessibilityLabel="Add block below"
      >
        <Text style={{ color: theme.colors.textSecondary, fontSize: 18, lineHeight: 20 }}>+</Text>
      </Pressable>
      <View
        {...(draggable ? dnd.handleProps(block.id) : {})}
        style={{
          width: 18,
          height: 22,
          borderRadius: 4,
          alignItems: "center",
          justifyContent: "center",
          cursor: draggable ? "grab" : "default",
        }}
        accessibilityLabel="Drag to reorder"
      >
        <Text style={{ color: theme.colors.textSecondary, fontSize: 14, lineHeight: 16 }}>⠿</Text>
      </View>
    </View>
  );
}
