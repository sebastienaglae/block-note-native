/** Additional default block renderers: toggles, media, embeds, table, page link. */
import { Platform, Pressable, Text, TextInput, View } from "react-native";
import type { BlockRenderer } from "../../types";
import type { Theme } from "../../theme/theme";
import { Icon } from "../../icons/Icon";
import { Embed } from "./Embed";
import { AudioPlayer } from "./AudioPlayer";
import { MOBILE_UA, MapEmbed, MediaEmpty, hostOf, openUrl, videoEmbed } from "./mediaParts";

function Triangle({ collapsed, theme, onPress }: { collapsed: boolean; theme: Theme; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ hovered }: { hovered?: boolean }) => ({
        width: 22,
        height: 24,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 4,
        backgroundColor: hovered ? theme.colors.menuHover : "transparent",
        cursor: "pointer",
      })}
    >
      <Icon name={collapsed ? "chevronRight" : "chevronDown"} size={15} color={theme.colors.accent} />
    </Pressable>
  );
}

const ToggleListItem: BlockRenderer = ({ block, editor, theme, InlineContentView }) => (
  <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
    <Triangle collapsed={!!block.props.collapsed} theme={theme} onPress={() => editor.updateBlock(block.id, { props: { collapsed: !block.props.collapsed } })} />
    <View style={{ flex: 1 }}>{InlineContentView({ textStyle: { fontSize: 16 }, placeholder: "bnn.ph.toggle" })}</View>
  </View>
);

const ToggleHeading: BlockRenderer = ({ block, editor, theme, InlineContentView }) => {
  const level = Number(block.props.level) || 1;
  const sizes: Record<number, number> = { 1: 30, 2: 24, 3: 20 };
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
      <View style={{ paddingTop: level === 1 ? 6 : 3 }}>
        <Triangle collapsed={!!block.props.collapsed} theme={theme} onPress={() => editor.updateBlock(block.id, { props: { collapsed: !block.props.collapsed } })} />
      </View>
      <View style={{ flex: 1 }}>
        {InlineContentView({ textStyle: { fontSize: sizes[level], fontWeight: "700", lineHeight: sizes[level] * 1.25 }, placeholder: "bnn.ph.heading" })}
      </View>
    </View>
  );
};

const VideoBlock: BlockRenderer = ({ block, editor, theme }) => {
  const url = String(block.props.url || "");
  if (!url)
    return <MediaEmpty editor={editor} blockId={block.id} propKey="url" icon="video" theme={theme} labelKey="bnn.media.addVideo" labelFallback="Add a video" phKey="bnn.media.urlVideo" phFallback="Video URL (YouTube, Vimeo, Loom, Dailymotion…)" />;
  const embed = videoEmbed(url);
  if (Platform.OS === "web") {
    if (embed) return <Embed src={embed} title="video" height={340} />;
    return <video src={url} controls style={{ width: "100%", borderRadius: 8, backgroundColor: "#000" }} />;
  }
  return <Embed src={embed || url} title="video" height={240} userAgent={embed ? MOBILE_UA : undefined} />;
};

const AudioBlock: BlockRenderer = ({ block, editor, theme }) => {
  const url = String(block.props.url || "");
  if (!url)
    return <MediaEmpty editor={editor} blockId={block.id} propKey="url" icon="audio" theme={theme} labelKey="bnn.media.addAudio" labelFallback="Add an audio file" phKey="bnn.media.urlAudio" phFallback="Audio URL" />;
  return <AudioPlayer url={url} theme={theme} />;
};

const FileBlock: BlockRenderer = ({ block, editor, theme }) => {
  const url = String(block.props.url || "");
  if (!url)
    return <MediaEmpty editor={editor} blockId={block.id} propKey="url" icon="file" theme={theme} labelKey="bnn.media.addFile" labelFallback="Add a file" phKey="bnn.media.urlFile" phFallback="File URL" />;
  const name = String(block.props.name || "") || hostOf(url);
  return (
    <Pressable
      onPress={() => openUrl(url)}
      style={({ hovered }: { hovered?: boolean }) => ({ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: hovered ? theme.colors.menuHover : theme.colors.backgroundSecondary, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius, paddingVertical: 10, paddingHorizontal: 12 })}
    >
      <Icon name="file" size={18} color={theme.colors.textSecondary} />
      <Text style={{ color: theme.colors.text, flex: 1 }}>{name || "File"}</Text>
      <Icon name="link" size={14} color={theme.colors.accent} />
    </Pressable>
  );
};

const BookmarkBlock: BlockRenderer = ({ block, editor, theme }) => {
  const url = String(block.props.url || "");
  if (!url)
    return <MediaEmpty editor={editor} blockId={block.id} propKey="url" icon="bookmark" theme={theme} labelKey="bnn.media.addBookmark" labelFallback="Add a link to bookmark" phKey="bnn.media.urlBookmark" phFallback="Paste a URL" />;
  const title = String(block.props.title || "") || hostOf(url);
  return (
    <Pressable
      onPress={() => openUrl(url)}
      style={({ hovered }: { hovered?: boolean }) => ({ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: hovered ? theme.colors.menuHover : "transparent", borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius, padding: 12 })}
    >
      <Icon name="bookmark" size={18} color={theme.colors.textSecondary} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.colors.text, fontWeight: "600" }} numberOfLines={1}>{title}</Text>
        {block.props.description ? (
          <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }} numberOfLines={2}>{String(block.props.description)}</Text>
        ) : null}
        <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 4 }} numberOfLines={1}>{hostOf(url)}</Text>
      </View>
    </Pressable>
  );
};

const MapBlock: BlockRenderer = ({ block, editor, theme }) => {
  const query = String(block.props.query || "");
  if (!query)
    return <MediaEmpty editor={editor} blockId={block.id} propKey="query" icon="map" theme={theme} labelKey="bnn.media.addMap" labelFallback="Add a location" phKey="bnn.media.urlMap" phFallback="Place or address" />;
  return <MapEmbed query={query} theme={theme} />;
};

const PageLinkBlock: BlockRenderer = ({ block, theme, onOpenPage }) => (
  <Pressable
    onPress={() => onOpenPage?.(String(block.props.pageId || ""))}
    style={({ hovered }: { hovered?: boolean }) => ({ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4, paddingHorizontal: 4, borderRadius: 5, backgroundColor: hovered ? theme.colors.menuHover : "transparent" })}
  >
    {block.props.icon ? <Text style={{ fontSize: 16 }}>{String(block.props.icon)}</Text> : <Icon name="page" size={16} color={theme.colors.textSecondary} />}
    <Text style={{ color: theme.colors.text, textDecorationLine: "underline", fontWeight: "500" }}>{String(block.props.title || "Untitled")}</Text>
  </Pressable>
);

const TableBlock: BlockRenderer = ({ block, editor, theme, t }) => {
  const cells = (Array.isArray(block.props.cells) ? block.props.cells : [["", ""], ["", ""]]) as string[][];
  const setCell = (r: number, c: number, val: string) => {
    const next = cells.map((row) => row.slice());
    next[r][c] = val;
    editor.updateBlock(block.id, { props: { cells: next } });
  };
  const addRow = () => editor.updateBlock(block.id, { props: { cells: [...cells.map((r) => r.slice()), Array(cells[0]?.length || 1).fill("")] } });
  const addCol = () => editor.updateBlock(block.id, { props: { cells: cells.map((r) => [...r, ""]) } });

  const SmallBtn = ({ icon, label, onPress }: { icon: "add"; label: string; onPress: () => void }) => (
    <Pressable onPress={onPress} style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 5, borderWidth: 1, borderColor: theme.colors.border }}>
      <Icon name={icon} size={12} color={theme.colors.textSecondary} />
      <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>{label}</Text>
    </Pressable>
  );

  return (
    <View>
      <View style={{ borderWidth: 1, borderColor: theme.colors.border, borderRadius: 6, overflow: "hidden" }}>
        {cells.map((row, r) => (
          <View key={r} style={{ flexDirection: "row" }}>
            {row.map((cell, c) => (
              <TextInput
                key={c}
                value={cell}
                editable={!editor.locked}
                onChangeText={(v: string) => setCell(r, c, v)}
                placeholder="—"
                placeholderTextColor={theme.colors.placeholder}
                style={{ flex: 1, minWidth: 90, paddingVertical: 8, paddingHorizontal: 10, color: theme.colors.text, borderRightWidth: c < row.length - 1 ? 1 : 0, borderBottomWidth: r < cells.length - 1 ? 1 : 0, borderColor: theme.colors.border }}
              />
            ))}
          </View>
        ))}
      </View>
      {!editor.locked ? (
        <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
          <SmallBtn icon="add" label={t("bnn.table.row", "Row")} onPress={addRow} />
          <SmallBtn icon="add" label={t("bnn.table.col", "Column")} onPress={addCol} />
        </View>
      ) : null}
    </View>
  );
};

export const extraBlockRenderers: Record<string, BlockRenderer> = {
  toggleListItem: ToggleListItem,
  toggleHeading: ToggleHeading,
  video: VideoBlock,
  audio: AudioBlock,
  file: FileBlock,
  bookmark: BookmarkBlock,
  mapView: MapBlock,
  pageLink: PageLinkBlock,
  table: TableBlock,
};
