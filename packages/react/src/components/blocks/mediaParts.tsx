/** Shared building blocks for media blocks: inline URL input + OSM map embed. */
import { useState } from "react";
import { Image, Linking, Platform, Pressable, Text, TextInput, View } from "react-native";
import type { Editor } from "@sebastienaglae/bnn-core";
import type { Theme } from "../../theme/theme";
import { Icon } from "../../icons/Icon";
import type { IconName } from "../../icons/iconNames";
import { useT } from "../../i18n/I18nContext";
import { Embed } from "./Embed";
import type { ImageProvider } from "../../types";

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
  const yt = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]+)/.exec(url);
  // Use the privacy-friendly embed host + playsinline/rel params; this avoids the
  // "Video unavailable / error 153" the default embed throws inside an Android WebView.
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}?playsinline=1&rel=0&modestbranding=1`;
  const vimeo = /vimeo\.com\/(?:video\/)?(\d+)/.exec(url);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  const dailymotion = /(?:dailymotion\.com\/video\/|dai\.ly\/)([a-zA-Z0-9]+)/.exec(url);
  if (dailymotion) return `https://www.dailymotion.com/embed/video/${dailymotion[1]}`;
  const loom = /loom\.com\/(?:share|embed)\/([\w-]+)/.exec(url);
  if (loom) return `https://www.loom.com/embed/${loom[1]}`;
  const wistia = /(?:wistia\.com\/medias\/|wi\.st\/medias\/|wistia\.net\/embed\/iframe\/)([\w-]+)/.exec(url);
  if (wistia) return `https://fast.wistia.net/embed/iframe/${wistia[1]}`;
  const streamable = /streamable\.com\/(?:e\/)?(\w+)/.exec(url);
  if (streamable) return `https://streamable.com/e/${streamable[1]}`;
  // Twitch requires the embedding parent host, which only exists on web.
  const twitch = /twitch\.tv\/videos\/(\d+)/.exec(url);
  if (twitch && typeof window !== "undefined" && window.location?.hostname) {
    return `https://player.twitch.tv/?video=${twitch[1]}&parent=${window.location.hostname}&autoplay=false`;
  }
  return null;
}

export function allowedVideoEmbed(url: string, providers?: import("../../types").VideoProvider[]): string | null {
  const allowed = providers ?? ["youtube", "vimeo", "dailymotion", "loom", "wistia", "streamable", "twitch", "direct"];
  const lower = url.toLowerCase();
  const provider = lower.includes("youtube") || lower.includes("youtu.be") ? "youtube" : lower.includes("vimeo") ? "vimeo" : lower.includes("dailymotion") || lower.includes("dai.ly") ? "dailymotion" : lower.includes("loom") ? "loom" : lower.includes("wistia") || lower.includes("wi.st") ? "wistia" : lower.includes("streamable") ? "streamable" : lower.includes("twitch") ? "twitch" : "direct";
  return allowed.includes(provider) ? videoEmbed(url) ?? (provider === "direct" ? url : null) : null;
}

export function ImageProviderPicker({ providers, onSelect }: { providers: ImageProvider[]; onSelect: (url: string) => void }): JSX.Element {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<import("../../types").ImageSearchResult[]>([]);
  const search = async () => { const provider = providers[0]; if (provider && query.trim()) setResults(await provider.search(query.trim())); };
  return <View style={{ marginTop: 8, gap: 8 }}>
    <View style={{ flexDirection: "row", gap: 8 }}><TextInput value={query} onChangeText={setQuery} onSubmitEditing={() => void search()} placeholder="Search images" style={{ flex: 1, borderWidth: 1, borderColor: "#ccc", padding: 8 }} /><Pressable onPress={() => void search()}><Text>Search</Text></Pressable></View>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{results.map((r) => <Pressable key={r.url} onPress={() => onSelect(r.url)}><Image source={{ uri: r.thumbnailUrl ?? r.url }} style={{ width: 80, height: 60 }} /></Pressable>)}</View>
  </View>;
}

/** A mobile Chrome UA — YouTube serves an embeddable player to it inside a WebView. */
export const MOBILE_UA =
  "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";

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

  // Empty media blocks are not part of the readonly preview. Keep this guard
  // here as well as in the block list so custom/nested render paths cannot
  // expose the "add media" editor accidentally.
  if (editor.locked) return <View />;

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

/**
 * OpenStreetMap shown inside a WebView (Leaflet). Geocoding (Nominatim) happens
 * *inside* the WebView — its browser User-Agent satisfies Nominatim's policy,
 * whereas a React-Native `fetch` gets blocked. The map is static (locked) and
 * its tiles follow the light/dark theme (CARTO basemaps).
 */
export function MapEmbed({ query, theme, provider = "openstreetmap" }: { query: string; theme: Theme; provider?: import("../../types").MapProvider }): JSX.Element {
  const dark = !!theme.dark;
  const bg = theme.colors.backgroundSecondary;
  const tiles = dark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
  const q = JSON.stringify(query);
  const textColor = theme.colors.textSecondary;

  const html = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>html,body,#m{height:100%;margin:0;background:${bg}}
#msg{display:flex;height:100%;align-items:center;justify-content:center;font:13px sans-serif;color:${textColor}}
.leaflet-control-attribution{font-size:9px}</style></head>
<body><div id="m"><div id="msg">…</div></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>
fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q='+encodeURIComponent(${q}))
 .then(function(r){return r.json();}).then(function(d){
   var hit=d&&d[0];
   if(!hit){document.getElementById('msg').textContent=${JSON.stringify(query)}+' — not found';return;}
   document.getElementById('m').innerHTML='';
   var lat=parseFloat(hit.lat),lon=parseFloat(hit.lon);
   var map=L.map('m',{zoomControl:false,dragging:false,scrollWheelZoom:false,doubleClickZoom:false,
     boxZoom:false,keyboard:false,touchZoom:false,tap:false,attributionControl:true}).setView([lat,lon],14);
   L.tileLayer('${tiles}',{maxZoom:19,attribution:'© OpenStreetMap © CARTO'}).addTo(map);
   L.marker([lat,lon]).addTo(map);
 }).catch(function(){document.getElementById('msg').textContent='Map unavailable';});
</script></body></html>`;
  const encoded = encodeURIComponent(query);
  const mapUrl = provider === "google" ? `https://www.google.com/maps/search/?api=1&query=${encoded}` : provider === "apple" ? `https://maps.apple.com/?q=${encoded}` : `https://www.openstreetmap.org/search?query=${encoded}`;
  return <View><Embed html={html} title="map" height={260} interactive={false} background={bg} /><Pressable onPress={() => openUrl(mapUrl)} style={{ padding: 8 }}><Text style={{ color: theme.colors.accent, textAlign: "right" }}>Open in {provider === "google" ? "Google Maps" : provider === "apple" ? "Apple Maps" : "OpenStreetMap"}</Text></Pressable></View>;
}
