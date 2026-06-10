import { useLayoutEffect, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import type { Editor, Styles } from "@bnn/core";
import type { Theme } from "../theme/theme";

export interface FormattingToolbarProps {
  editor: Editor;
  theme: Theme;
  visible: boolean;
  /** Changes whenever the selection moves, so the position re-measures. */
  selectionKey: string;
}

interface MarkButton {
  label: string;
  style: keyof Styles;
  italic?: boolean;
  strike?: boolean;
  underline?: boolean;
  mono?: boolean;
}

const MARKS: MarkButton[] = [
  { label: "B", style: "bold" },
  { label: "i", style: "italic", italic: true },
  { label: "U", style: "underline", underline: true },
  { label: "S", style: "strike", strike: true },
  { label: "</>", style: "code", mono: true },
];

export function FormattingToolbar({ editor, theme, visible, selectionKey }: FormattingToolbarProps): JSX.Element | null {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (Platform.OS !== "web" || !visible) {
      setPos(null);
      return;
    }
    const sel = window.getSelection?.();
    if (!sel || sel.rangeCount === 0) return;
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;
    const top = Math.max(8, rect.top - 46);
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - 320));
    setPos({ top, left });
  }, [visible, selectionKey]);

  if (!visible) return null;

  const active = editor.getActiveStyles();

  const containerStyle =
    Platform.OS === "web"
      ? ({
          position: "fixed" as const,
          top: pos?.top ?? 0,
          left: pos?.left ?? 0,
          opacity: pos ? 1 : 0,
        } as object)
      : ({ position: "absolute" as const, bottom: 0, left: 0, right: 0 } as object);

  const toggle = (style: keyof Styles) => editor.toggleStyles({ [style]: true } as Styles);

  const highlightSwatches: Array<[string, string]> = [
    ["yellow", theme.highlightColors.yellow],
    ["green", theme.highlightColors.green],
    ["blue", theme.highlightColors.blue],
    ["pink", theme.highlightColors.pink],
  ];

  return (
    <View
      style={[
        containerStyle,
        {
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: theme.colors.menuBackground,
          borderRadius: theme.radius + 2,
          borderWidth: 1,
          borderColor: theme.colors.border,
          paddingHorizontal: 4,
          paddingVertical: 4,
          gap: 2,
          shadowColor: "#000",
          shadowOpacity: 0.18,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
          zIndex: 1000,
        },
      ]}
    >
      {MARKS.map((m) => {
        const isActive = !!active[m.style];
        return (
          <Pressable
            key={m.style}
            onPress={() => toggle(m.style)}
            style={{
              minWidth: 30,
              height: 30,
              paddingHorizontal: 6,
              borderRadius: 5,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isActive ? theme.colors.accentSoft : "transparent",
            }}
          >
            <Text
              style={{
                color: isActive ? theme.colors.accent : theme.colors.text,
                fontWeight: m.style === "bold" ? "700" : "500",
                fontStyle: m.italic ? "italic" : "normal",
                textDecorationLine: m.underline ? "underline" : m.strike ? "line-through" : "none",
                fontFamily: m.mono ? theme.monoFamily : theme.fontFamily,
                fontSize: 14,
              }}
            >
              {m.label}
            </Text>
          </Pressable>
        );
      })}

      <Pressable
        onPress={() => {
          const url = Platform.OS === "web" ? window.prompt?.("Link URL", "https://") : null;
          if (url) editor.createLink(url);
        }}
        style={{ minWidth: 30, height: 30, borderRadius: 5, alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ color: theme.colors.text, fontSize: 14 }}>🔗</Text>
      </Pressable>

      <View style={{ width: 1, height: 20, backgroundColor: theme.colors.border, marginHorizontal: 2 }} />

      {highlightSwatches.map(([name, color]) => (
        <Pressable
          key={name}
          onPress={() => editor.addStyles({ backgroundColor: name })}
          style={{
            width: 22,
            height: 22,
            borderRadius: 5,
            backgroundColor: color,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}
        />
      ))}
      <Pressable
        onPress={() => editor.removeStyles({ backgroundColor: undefined, textColor: undefined })}
        style={{ minWidth: 28, height: 26, borderRadius: 5, alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>⌫</Text>
      </Pressable>
    </View>
  );
}
