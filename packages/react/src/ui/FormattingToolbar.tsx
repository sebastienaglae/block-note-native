import { useLayoutEffect, useRef, useState } from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";
import type { Editor, EditorSelection, Styles } from "@sebastienaglae/bnn-core";
import type { Theme } from "../theme/theme";
import { Icon } from "../icons/Icon";
import type { IconName } from "../icons/iconNames";
import { useT } from "../i18n/I18nContext";

export interface FormattingToolbarProps {
  editor: Editor;
  theme: Theme;
  visible: boolean;
  selectionKey: string;
  /** Native only: keyboard height — the bar floats just above the keyboard (clear of the OS selection menu). */
  nativeBottom?: number;
}

const MARKS: Array<{ style: keyof Styles; icon: IconName; key: string; fallback: string }> = [
  { style: "bold", icon: "bold", key: "bnn.toolbar.bold", fallback: "Bold" },
  { style: "italic", icon: "italic", key: "bnn.toolbar.italic", fallback: "Italic" },
  { style: "underline", icon: "underline", key: "bnn.toolbar.underline", fallback: "Underline" },
  { style: "strike", icon: "strike", key: "bnn.toolbar.strike", fallback: "Strikethrough" },
  { style: "code", icon: "code", key: "bnn.toolbar.code", fallback: "Code" },
];

export function FormattingToolbar({ editor, theme, visible, selectionKey, nativeBottom = 0 }: FormattingToolbarProps): JSX.Element | null {
  const t = useT();
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [linkMode, setLinkMode] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [colorOpen, setColorOpen] = useState(false);
  const savedSel = useRef<EditorSelection>(null);

  const applyLink = () => {
    if (savedSel.current) editor.setSelection(savedSel.current);
    if (linkUrl.trim()) editor.createLink(linkUrl.trim());
    setLinkMode(false);
    setLinkUrl("");
  };
  const openLink = () => {
    savedSel.current = editor.selection;
    setLinkMode(true);
  };

  useLayoutEffect(() => {
    if (Platform.OS !== "web" || !visible) {
      setPos(null);
      return;
    }
    const sel = window.getSelection?.();
    if (!sel || sel.rangeCount === 0) return;
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;
    setPos({ top: Math.max(8, rect.top - 48), left: Math.max(8, Math.min(rect.left, window.innerWidth - 360)) });
  }, [visible, selectionKey]);

  // Reset transient UI when the toolbar hides.
  useLayoutEffect(() => {
    if (!visible) {
      setLinkMode(false);
      setColorOpen(false);
      setLinkUrl("");
    }
  }, [visible]);

  if (!visible) return null;
  const active = editor.getActiveStyles();

  // Keep the editor selection alive when interacting with the toolbar (#8).
  const keepSelection = Platform.OS === "web" ? { onMouseDown: (e: { preventDefault: () => void }) => e.preventDefault() } : {};

  // Native: pin the bar just above the keyboard so it stays clear of the OS
  // copy/cut/paste selection menu (which hugs the selection). Web: over the selection.
  const container =
    Platform.OS === "web"
      ? ({ position: "fixed", top: pos?.top ?? 0, left: pos?.left ?? 0, opacity: pos ? 1 : 0 } as object)
      : ({
          position: "absolute",
          bottom: nativeBottom + 6,
          left: 0,
          right: 0,
          alignItems: "center",
        } as object);

  const cardStyle = {
    flexDirection: "row" as const,
    alignItems: "center" as const,
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
  };

  const Btn = ({ icon, label, onPress, isActive }: { icon: IconName; label: string; onPress: () => void; isActive?: boolean }) => (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      style={({ hovered }: { hovered?: boolean }) => ({
        width: 30,
        height: 30,
        borderRadius: 5,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: isActive ? theme.colors.accentSoft : hovered ? theme.colors.menuHover : "transparent",
      })}
    >
      <Icon name={icon} size={16} color={isActive ? theme.colors.accent : theme.colors.text} />
    </Pressable>
  );

  if (linkMode) {
    return (
      <View style={[container, cardStyle]} {...(keepSelection as object)}>
        <Icon name="link" size={16} color={theme.colors.textSecondary} />
        <TextInput
          value={linkUrl}
          onChangeText={setLinkUrl}
          autoFocus
          placeholder={t("bnn.toolbar.linkUrl", "Paste a link")}
          placeholderTextColor={theme.colors.placeholder}
          onSubmitEditing={applyLink}
          style={{ width: 220, marginHorizontal: 6, color: theme.colors.text, fontSize: 14, paddingVertical: 4 }}
        />
        <Pressable
          onPress={applyLink}
          style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 5, backgroundColor: theme.colors.accent }}
        >
          <Text style={{ color: theme.colors.onAccent, fontSize: 13, fontWeight: "600" }}>{t("bnn.toolbar.linkApply", "Apply")}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={container} {...(keepSelection as object)}>
      <View style={cardStyle}>
        {MARKS.map((m) => (
          <Btn key={String(m.style)} icon={m.icon} label={t(m.key, m.fallback)} isActive={!!active[m.style]} onPress={() => editor.toggleStyles({ [m.style]: true } as Styles)} />
        ))}
        <View style={{ width: 1, height: 20, backgroundColor: theme.colors.border, marginHorizontal: 2 }} />
        <Btn icon="link" label={t("bnn.toolbar.link", "Link")} onPress={openLink} />
        <Btn icon="palette" label={t("bnn.toolbar.highlight", "Highlight")} onPress={() => { savedSel.current = editor.selection; setColorOpen((o) => !o); }} isActive={colorOpen} />
        <Btn icon="removeFormat" label={t("bnn.toolbar.clear", "Clear formatting")} onPress={() => editor.removeStyles({ backgroundColor: undefined, textColor: undefined, bold: undefined, italic: undefined, underline: undefined, strike: undefined, code: undefined })} />
      </View>

      {colorOpen ? (
        <View
          style={[
            { marginTop: 6, padding: 8, gap: 8 },
            cardStyle,
            { flexDirection: "column", alignItems: "stretch" },
          ]}
        >
          <Text style={{ fontSize: 10, fontWeight: "700", color: theme.colors.textSecondary, textTransform: "uppercase" }}>{t("bnn.toolbar.textColor", "Text color")}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
            {Object.entries(theme.textColors).map(([name, color]) => (
              <Pressable
                key={name}
                onPress={() => { if (savedSel.current) editor.setSelection(savedSel.current); editor.addStyles({ textColor: name }); setColorOpen(false); }}
                style={{ width: 28, height: 28, borderRadius: 5, borderWidth: 1, borderColor: theme.colors.border, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.background }}
              >
                <Text style={{ color: name === "default" ? theme.colors.text : color, fontWeight: "700", fontSize: 15 }}>A</Text>
              </Pressable>
            ))}
          </View>
          <Text style={{ fontSize: 10, fontWeight: "700", color: theme.colors.textSecondary, textTransform: "uppercase" }}>{t("bnn.toolbar.highlight", "Highlight")}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
            {Object.entries(theme.highlightColors).map(([name, color]) => (
              <Pressable
                key={name}
                onPress={() => { if (savedSel.current) editor.setSelection(savedSel.current); editor.addStyles({ backgroundColor: name }); setColorOpen(false); }}
                style={{ width: 28, height: 28, borderRadius: 5, borderWidth: 1, borderColor: theme.colors.border, alignItems: "center", justifyContent: "center", backgroundColor: name === "default" ? theme.colors.background : color }}
              >
                <Text style={{ color: theme.colors.text, fontWeight: "700", fontSize: 15 }}>{name === "default" ? "⌀" : "A"}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}
