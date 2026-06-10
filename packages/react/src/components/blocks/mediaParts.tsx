/** Shared building blocks for media blocks: inline URL input + OSM map embed. */
import { useEffect, useState } from "react";
import { Linking, Platform, Pressable, Text, TextInput, View } from "react-native";
import type { Editor } from "@sebastienaglae/bnn-core";
import type { Theme } from "../../theme/theme";
import { Icon } from "../../icons/Icon";
import type { IconName } from "../../icons/iconNames";
import { useT } from "../../i18n/I18nContext";
import { Embed } from "./Embed";

export function openUrl(url: string): void {
  if (!url) return;
  if (Platform.OS === "web") window.open(url, "_blank", "noopener");
  else Linking.openURL(url).catch(() => undefined);
}

export function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export function videoEmbed(url: string): string | null {
  const yt = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/.exec(url);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = /vimeo\.com\/(\d+)/.exec(url);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

/** Empty-state placeholder with an inline URL input (replaces window.prompt, #17). */
export function MediaEmpty(props: {
  editor: Editor;
  blockId: string;
  propKey: string;
  icon: IconName;
  theme: Theme;
  labelKey: string;
  labelFallback: string;
  phKey: string;
  phFallback: string;
}): JSX.Element {
  const { editor, blockId, propKey, icon, theme, labelKey, labelFallback, phKey, phFallback } = props;
  const t = useT();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");

  const apply = () => {
    const v = url.trim();
    if (v) editor.updateBlock(blockId, { props: { [propKey]: v } });
    setOpen(false);
    setUrl("");
  };

  if (open) {
    return (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          backgroundColor: theme.colors.backgroundSecondary,
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: theme.radius,
          padding: 10,
        }}
      >
        <Icon name={icon} size={16} color={theme.colors.textSecondary} />
        <TextInput
          value={url}
          onChangeText={setUrl}
          autoFocus
          placeholder={t(phKey, phFallback)}
          placeholderTextColor={theme.colors.placeholder}
          onSubmitEditing={apply}
          style={{ flex: 1, color: theme.colors.text, fontSize: 14, paddingVertical: 4 }}
        />
        <Pressable onPress={apply} style={{ backgroundColor: theme.colors.accent, borderRadius: 5, paddingHorizontal: 12, paddingVertical: 6 }}>
          <Text style={{ color: theme.colors.onAccent, fontSize: 13, fontWeight: "600" }}>{t("bnn.media.embed", "Embed")}</Text>
        </Pressable>
        <Pressable onPress={() => { setOpen(false); setUrl(""); }} style={{ padding: 4 }}>
          <Icon name="close" size={15} color={theme.colors.textSecondary} />
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => setOpen(true)}
      style={({ hovered }: { hovered?: boolean }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        backgroundColor: hovered ? theme.colors.menuHover : theme.colors.backgroundSecondary,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius,
        paddingVertical: 12,
        paddingHorizontal: 14,
      })}
    >
      <Icon name={icon} size={18} color={theme.colors.textSecondary} />
      <Text style={{ color: theme.colors.textSecondary }}>{t(labelKey, labelFallback)}</Text>
    </Pressable>
  );
}

interface Bbox { w: string; s: string; e: string; n: string; lat: string; lon: string }

/** Geocodes a place via OpenStreetMap Nominatim and embeds the OSM map (#17). */
export function MapEmbed({ query, theme }: { query: string; theme: Theme }): JSX.Element {
  const [bbox, setBbox] = useState<Bbox | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setBbox(null);
    setFailed(false);
    fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`, {
      headers: { Accept: "application/json" },
    })
      .then((r) => r.json())
      .then((data: Array<{ boundingbox: string[]; lat: string; lon: string }>) => {
        if (cancelled) return;
        const hit = data?.[0];
        if (!hit) {
          setFailed(true);
          return;
        }
        const b = hit.boundingbox; // [south, north, west, east]
        setBbox({ s: b[0], n: b[1], w: b[2], e: b[3], lat: hit.lat, lon: hit.lon });
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [query]);

  if (failed) {
    return (
      <Pressable
        onPress={() => openUrl(`https://www.openstreetmap.org/search?query=${encodeURIComponent(query)}`)}
        style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: theme.colors.backgroundSecondary, borderRadius: theme.radius, padding: 14, borderWidth: 1, borderColor: theme.colors.border }}
      >
        <Icon name="map" size={18} color={theme.colors.textSecondary} />
        <Text style={{ color: theme.colors.textSecondary }}>{query}</Text>
      </Pressable>
    );
  }

  if (!bbox) {
    return (
      <View style={{ height: 80, backgroundColor: theme.colors.backgroundSecondary, borderRadius: theme.radius, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>…</Text>
      </View>
    );
  }

  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox.w},${bbox.s},${bbox.e},${bbox.n}&layer=mapnik&marker=${bbox.lat},${bbox.lon}`;
  return <Embed src={src} title="map" height={320} />;
}
