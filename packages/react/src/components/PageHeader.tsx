import { useRef, useState } from "react";
import { Image, Platform, Pressable, Text, View } from "react-native";
import { TITLE_BLOCK_ID, type Editor } from "@sebastienaglae/bnn-core";
import type { Theme } from "../theme/theme";
import { RichTextInput } from "../editable/RichTextInput";
import { EmojiPicker } from "../ui/EmojiPicker";
import { Overlay } from "../ui/Overlay";
import { Icon } from "../icons/Icon";
import { useT } from "../i18n/I18nContext";

const COVER_COLORS = ["#e0c3fc", "#8ec5fc", "#a1c4fd", "#ffd1ff", "#fdcbf1", "#a6c1ee", "#84fab0", "#fccb90"];
const CONTENT_MAX = 740;
const GUTTER = 58; // align icon/title with block text (#3)

function isUrl(s: string): boolean {
  return /^https?:\/\//.test(s) || s.startsWith("data:");
}

interface Measurable {
  measureInWindow?: (cb: (x: number, y: number, w: number, h: number) => void) => void;
}

export interface PageHeaderProps {
  editor: Editor;
  theme: Theme;
  locked: boolean;
}

export function PageHeader({ editor, theme, locked }: PageHeaderProps): JSX.Element {
  const meta = editor.meta;
  const sel = editor.selection;
  const t = useT();
  const [hover, setHover] = useState(false);
  const [picker, setPicker] = useState<{ top: number; left: number } | null>(null);
  const [coverIdx, setCoverIdx] = useState(0);
  const iconRef = useRef<Measurable | null>(null);
  const addIconRef = useRef<Measurable | null>(null);

  const showControls = !locked && (Platform.OS !== "web" || hover);
  const webHover =
    Platform.OS === "web"
      ? { onMouseEnter: () => setHover(true), onMouseLeave: () => setHover(false) }
      : {};

  const openPicker = (node: Measurable | null) => {
    if (locked) return;
    if (node?.measureInWindow) {
      node.measureInWindow((x, y, _w, h) => setPicker({ top: y + h + 6, left: x }));
    } else {
      setPicker({ top: 120, left: 90 });
    }
  };

  const addCover = () => {
    const next = COVER_COLORS[coverIdx % COVER_COLORS.length];
    setCoverIdx((i) => i + 1);
    editor.setPageCover(next);
  };
  const changeCover = () => {
    if (Platform.OS === "web") {
      const url = window.prompt?.(t("bnn.header.coverUrl", "Cover image URL (blank for a color)"), "");
      if (url) {
        editor.setPageCover(url);
        return;
      }
    }
    addCover();
  };

  const ControlButton = ({
    icon,
    label,
    onPress,
    innerRef,
  }: {
    icon: "emoji" | "cover" | "close";
    label: string;
    onPress: () => void;
    innerRef?: React.MutableRefObject<Measurable | null>;
  }) => (
    <Pressable
      ref={innerRef as never}
      onPress={onPress}
      style={({ hovered }: { hovered?: boolean }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 5,
        backgroundColor: hovered ? theme.colors.menuHover : "transparent",
      })}
    >
      <Icon name={icon} size={14} color={theme.colors.textSecondary} />
      <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>{label}</Text>
    </Pressable>
  );

  const needsControlRow = !locked && (!meta.icon || !meta.cover);

  return (
    <View {...(webHover as object)}>
      {/* Cover (full-bleed) */}
      {meta.cover ? (
        <View style={{ width: "100%", height: 180, backgroundColor: theme.colors.backgroundSecondary }}>
          {isUrl(meta.cover) ? (
            <Image source={{ uri: meta.cover }} resizeMode="cover" style={{ width: "100%", height: 180 }} />
          ) : (
            <View style={{ width: "100%", height: 180, backgroundColor: meta.cover }} />
          )}
          {/* Cover controls: always present (not hover-gated) so they're clickable (#4) */}
          {!locked ? (
            <View
              style={{
                position: "absolute",
                right: 16,
                bottom: 12,
                flexDirection: "row",
                gap: 4,
                backgroundColor: theme.colors.menuBackground,
                borderRadius: 6,
                padding: 2,
                opacity: showControls ? 1 : 0.85,
                zIndex: 20,
              }}
            >
              <ControlButton icon="cover" label={t("bnn.header.changeCover", "Change cover")} onPress={changeCover} />
              <ControlButton icon="close" label={t("bnn.header.removeCover", "Remove")} onPress={() => editor.setPageCover(null)} />
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={{ width: "100%", maxWidth: CONTENT_MAX, alignSelf: "center", paddingHorizontal: 16 }}>
        <View style={{ paddingLeft: GUTTER }}>
          {/* Icon (above the title) */}
          {meta.icon ? (
            <View ref={iconRef as never} style={{ marginTop: meta.cover ? -40 : 8, marginBottom: 2, zIndex: 5 }}>
              <Pressable
                disabled={locked}
                onPress={() => openPicker(iconRef.current)}
                style={({ hovered }: { hovered?: boolean }) => ({
                  width: 76,
                  height: 76,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: hovered ? theme.colors.menuHover : "transparent",
                })}
              >
                <Text style={{ fontSize: 60, lineHeight: 76 }}>{meta.icon}</Text>
              </Pressable>
            </View>
          ) : null}

          {/* Controls row: fixed height reserved so hovering doesn't shift the title (#3) */}
          {needsControlRow ? (
            <View style={{ height: 28, marginBottom: 2, flexDirection: "row" }}>
              <View
                style={{ flexDirection: "row", gap: 6, opacity: showControls ? 1 : 0 }}
                pointerEvents={showControls ? "auto" : "none"}
              >
                {!meta.icon ? (
                  <View ref={addIconRef as never}>
                    <ControlButton icon="emoji" label={t("bnn.header.addIcon", "Add icon")} onPress={() => openPicker(addIconRef.current)} />
                  </View>
                ) : null}
                {!meta.cover ? <ControlButton icon="cover" label={t("bnn.header.addCover", "Add cover")} onPress={addCover} /> : null}
              </View>
            </View>
          ) : null}

          {/* Fixed title */}
          <RichTextInput
            blockId={TITLE_BLOCK_ID}
            content={meta.title}
            active={sel?.blockId === TITLE_BLOCK_ID}
            selection={sel?.blockId === TITLE_BLOCK_ID ? { start: sel.start, end: sel.end } : null}
            placeholder={t("bnn.ph.title", "Untitled")}
            editable={!locked}
            theme={theme}
            textStyle={{ fontSize: 40, fontWeight: "700", lineHeight: 48, color: theme.colors.text }}
            onChange={(content, s) => editor.setPageTitle(content, { blockId: TITLE_BLOCK_ID, start: s.start, end: s.end })}
            onSelectionChange={(s) => editor.setSelection({ blockId: TITLE_BLOCK_ID, start: s.start, end: s.end })}
            onEnter={() => {
              const first = editor.document[0];
              if (first) editor.setSelection({ blockId: first.id, start: 0, end: 0 });
            }}
            onArrowOut={(dir) => {
              if (dir === "down") {
                const first = editor.document[0];
                if (first) editor.setSelection({ blockId: first.id, start: 0, end: 0 });
              }
            }}
          />
        </View>
      </View>

      {/* Emoji picker in a portal overlay: above everything + click-outside to close (#5, #6) */}
      {picker && !locked ? (
        <Overlay top={picker.top} left={picker.left} onClose={() => setPicker(null)}>
          <EmojiPicker
            theme={theme}
            onSelect={(e) => {
              editor.setPageIcon(e);
              setPicker(null);
            }}
            onRemove={
              meta.icon
                ? () => {
                    editor.setPageIcon(null);
                    setPicker(null);
                  }
                : undefined
            }
          />
        </Overlay>
      ) : null}
    </View>
  );
}
