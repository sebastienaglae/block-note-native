/** Shared building blocks for media blocks: inline URL input + OSM map embed. */
import { useEffect, useRef, useState } from "react";
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

/** Custom web audio player (accent play button + seekable progress). */
export function AudioPlayer({ url, theme }: { url: string; theme: Theme }): JSX.Element {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const [barW, setBarW] = useState(1);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const toggle = () => {
    const a = ref.current;
    if (!a) return;
    if (a.paused) {
      void a.play();
      setPlaying(true);
    } else {
      a.pause();
      setPlaying(false);
    }
  };
  const pct = dur ? cur / dur : 0;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: theme.colors.backgroundSecondary, borderRadius: theme.radius, borderWidth: 1, borderColor: theme.colors.border, paddingVertical: 10, paddingHorizontal: 12 }}>
      <Pressable onPress={toggle} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: theme.colors.accent, alignItems: "center", justifyContent: "center" }}>
        <Icon name={playing ? "pause" : "play"} size={16} color={theme.colors.onAccent} fill={theme.colors.onAccent} />
      </Pressable>
      <Pressable
        style={{ flex: 1, paddingVertical: 6 }}
        onLayout={(e: { nativeEvent: { layout: { width: number } } }) => setBarW(e.nativeEvent.layout.width || 1)}
        onPress={(e?: { nativeEvent?: { locationX?: number } }) => {
          const a = ref.current;
          const x = e?.nativeEvent?.locationX ?? 0;
          if (a && dur) a.currentTime = Math.max(0, Math.min(1, x / barW)) * dur;
        }}
      >
        <View style={{ height: 5, borderRadius: 3, backgroundColor: theme.colors.border }}>
          <View style={{ width: `${pct * 100}%`, height: 5, borderRadius: 3, backgroundColor: theme.colors.accent }} />
        </View>
      </Pressable>
      <Text style={{ fontSize: 11, color: theme.colors.textSecondary, fontVariant: ["tabular-nums"] }}>
        {fmt(cur)} / {fmt(dur || 0)}
      </Text>
      <audio
        ref={ref}
        src={url}
        onTimeUpdate={() => setCur(ref.current?.currentTime || 0)}
        onLoadedMetadata={() => setDur(ref.current?.duration || 0)}
        onEnded={() => setPlaying(false)}
        style={{ display: "none" }}
      />
    </View>
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

  // Interactive Leaflet map (pan/zoom) on OpenStreetMap tiles.
  const html = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>html,body,#m{height:100%;margin:0}</style></head><body><div id="m"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>
var lat=${bbox.lat},lon=${bbox.lon};var map=L.map('m').setView([lat,lon],14);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
L.marker([lat,lon]).addTo(map);</script></body></html>`;
  return <Embed html={html} title="map" height={320} />;
}
