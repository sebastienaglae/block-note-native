import { useRef, useState } from "react";
import { Dimensions, Image, Platform, Pressable, Text, TextInput, View } from "react-native";
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
  const [coverPick, setCoverPick] = useState<{ top: number; left: number } | null>(null);
  const [coverUrl, setCoverUrl] = useState("");
  const iconRef = useRef<Measurable | null>(null);
  const addIconRef = useRef<Measurable | null>(null);
  const addCoverRef = useRef<Measurable | null>(null);
  const changeCoverRef = useRef<Measurable | null>(null);

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

  // Opens the cover picker (color swatches + image URL) anchored under the button,
  // clamped so the 268px-wide popover never spills off either screen edge.
  const COVER_PICKER_W = 268;
  const openCoverPicker = (node: Measurable | null) => {
    if (locked) return;
    setCoverUrl("");
    const screenW = Dimensions.get("window").width;
    const clampLeft = (x: number) => Math.max(8, Math.min(x, screenW - COVER_PICKER_W - 8));
    if (node?.measureInWindow) node.measureInWindow((x, y, _w, h) => setCoverPick({ top: y + h + 6, left: clampLeft(x) }));
    else setCoverPick({ top: 120, left: clampLeft(90) });
  };
  const applyCoverUrl = () => {
    const v = coverUrl.trim();
    if (v) editor.setPageCover(v);
    setCoverPick(null);
    setCoverUrl("");
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
          {/* Cover controls: shown on hover, hidden otherwise (#5) */}
          {!locked ? (
            <View
              pointerEvents={showControls ? "auto" : "none"}
              style={{
                position: "absolute",
                right: 16,
                bottom: 12,
                flexDirection: "row",
                gap: 4,
                backgroundColor: theme.colors.menuBackground,
                borderRadius: 6,
                padding: 2,
                opacity: showControls ? 1 : 0,
                zIndex: 20,
              }}
            >
              <ControlButton icon="cover" label={t("bnn.header.changeCover", "Change cover")} innerRef={changeCoverRef} onPress={() => openCoverPicker(changeCoverRef.current)} />
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
                {!meta.cover ? (
                  <View ref={addCoverRef as never}>
                    <ControlButton icon="cover" label={t("bnn.header.addCover", "Add cover")} onPress={() => openCoverPicker(addCoverRef.current)} />
                  </View>
                ) : null}
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

      {/* Cover picker: pick a solid color or paste an image URL (#cover) */}
      {coverPick && !locked ? (
        <Overlay top={coverPick.top} left={coverPick.left} onClose={() => setCoverPick(null)}>
          <View
            style={{
              width: 268,
              backgroundColor: theme.colors.menuBackground,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: theme.colors.border,
              padding: 12,
              gap: 8,
              shadowColor: "#000",
              shadowOpacity: 0.18,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 6 },
              elevation: 8,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: "700", color: theme.colors.textSecondary, textTransform: "uppercase" }}>
              {t("bnn.header.coverColor", "Color")}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {COVER_COLORS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => {
                    editor.setPageCover(c);
                    setCoverPick(null);
                  }}
                  style={{ width: 32, height: 26, borderRadius: 5, backgroundColor: c, borderWidth: 1, borderColor: theme.colors.border }}
                />
              ))}
            </View>
            <Text style={{ fontSize: 10, fontWeight: "700", color: theme.colors.textSecondary, textTransform: "uppercase", marginTop: 2 }}>
              {t("bnn.header.coverImage", "Image URL")}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <TextInput
                value={coverUrl}
                onChangeText={setCoverUrl}
                autoFocus
                placeholder={t("bnn.header.coverUrl", "Paste an image URL")}
                placeholderTextColor={theme.colors.placeholder}
                onSubmitEditing={applyCoverUrl}
                style={{ flex: 1, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 5, paddingHorizontal: 8, paddingVertical: 6, color: theme.colors.text, fontSize: 13 }}
              />
              <Pressable onPress={applyCoverUrl} style={{ backgroundColor: theme.colors.accent, borderRadius: 5, paddingHorizontal: 12, paddingVertical: 7 }}>
                <Text style={{ color: theme.colors.onAccent, fontSize: 13, fontWeight: "600" }}>{t("bnn.header.coverApply", "Add")}</Text>
              </Pressable>
            </View>
          </View>
        </Overlay>
      ) : null}
    </View>
  );
}
