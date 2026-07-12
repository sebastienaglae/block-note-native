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

export function ImageProviderPicker({ providers, onSelect, theme }: { providers: ImageProvider[]; onSelect: (url: string) => void; theme: Theme }): JSX.Element {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<import("../../types").ImageSearchResult[]>([]);
  const [providerId, setProviderId] = useState(providers[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const provider = providers.find((item) => item.id === providerId) ?? providers[0];
  const search = async () => {
    const value = query.trim();
    if (!provider || !value || loading) return;
    setLoading(true); setError(false);
    try { setResults(await provider.search(value)); } catch { setResults([]); setError(true); }
    finally { setLoading(false); }
  };
  return <View style={{ marginTop: 10, gap: 10, backgroundColor: theme.colors.backgroundSecondary, borderRadius: theme.radius + 2, borderWidth: 1, borderColor: theme.colors.border, padding: 12 }}>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.accent + "20" }}><Icon name="image" size={16} color={theme.colors.accent} /></View>
      <View style={{ flex: 1 }}><Text style={{ color: theme.colors.text, fontWeight: "700", fontSize: 14 }}>Find an image</Text><Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>Search your connected image providers</Text></View>
    </View>
    {providers.length > 1 ? <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{providers.map((item) => <Pressable key={item.id} onPress={() => { setProviderId(item.id); setResults([]); }} style={{ borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: item.id === provider?.id ? theme.colors.accent : theme.colors.background, borderWidth: 1, borderColor: item.id === provider?.id ? theme.colors.accent : theme.colors.border }}><Text style={{ color: item.id === provider?.id ? theme.colors.onAccent : theme.colors.textSecondary, fontSize: 12, fontWeight: "600" }}>{item.label}</Text></Pressable>)}</View> : null}
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: theme.colors.background, borderRadius: theme.radius, borderWidth: 1, borderColor: theme.colors.border, paddingLeft: 10, paddingRight: 6 }}><Icon name="search" size={16} color={theme.colors.textSecondary} /><TextInput value={query} onChangeText={setQuery} onSubmitEditing={() => void search()} placeholder="Search images…" placeholderTextColor={theme.colors.placeholder} style={{ flex: 1, color: theme.colors.text, paddingVertical: 10, fontSize: 14 }} /><Pressable accessibilityRole="button" accessibilityLabel="Search images" onPress={() => void search()} disabled={loading || !query.trim()} style={{ borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: loading || !query.trim() ? theme.colors.border : theme.colors.accent }}><Text style={{ color: loading || !query.trim() ? theme.colors.textSecondary : theme.colors.onAccent, fontWeight: "700", fontSize: 13 }}>{loading ? "…" : "Search"}</Text></Pressable></View>
    {error ? <Text style={{ color: theme.colors.accent, fontSize: 12 }}>Couldn’t search this provider. Try again.</Text> : null}
    {!loading && !error && query.trim() && results.length === 0 ? <Text style={{ color: theme.colors.textSecondary, fontSize: 12, textAlign: "center", paddingVertical: 8 }}>No images found yet.</Text> : null}
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{results.map((item) => <Pressable key={item.url} accessibilityRole="button" accessibilityLabel={item.title ?? "Choose image"} onPress={() => onSelect(item.url)} style={{ width: "31%", minWidth: 84, aspectRatio: 1.35, borderRadius: 8, overflow: "hidden", backgroundColor: theme.colors.border }}><Image source={{ uri: item.thumbnailUrl ?? item.url }} style={{ width: "100%", height: "100%" }} resizeMode="cover" /></Pressable>)}</View>
  </View>;
}

export function ImageSourcePicker({ editor, blockId, providers, theme }: { editor: Editor; blockId: string; providers: ImageProvider[]; theme: Theme }): JSX.Element {
  const [mode, setMode] = useState<"url" | "provider">("url");
  const [url, setUrl] = useState("");
  const apply = () => { const value = url.trim(); if (value) editor.updateBlock(blockId, { props: { url: value } }); };
  return <View style={{ marginTop: 8, gap: 10 }}>
    <View style={{ flexDirection: "row", gap: 6 }}>
      {(["url", "provider"] as const).map((item) => <Pressable key={item} onPress={() => setMode(item)} style={{ flex: 1, alignItems: "center", borderRadius: 8, paddingVertical: 9, backgroundColor: mode === item ? theme.colors.accent : theme.colors.backgroundSecondary, borderWidth: 1, borderColor: mode === item ? theme.colors.accent : theme.colors.border }}><Text style={{ color: mode === item ? theme.colors.onAccent : theme.colors.textSecondary, fontWeight: "700", fontSize: 13 }}>{item === "url" ? "Image URL" : "Search provider"}</Text></Pressable>)}
    </View>
    {mode === "url" ? <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: theme.colors.backgroundSecondary, borderRadius: theme.radius, borderWidth: 1, borderColor: theme.colors.border, paddingLeft: 10, paddingRight: 6 }}><TextInput value={url} onChangeText={setUrl} onSubmitEditing={apply} placeholder="Paste an image URL…" placeholderTextColor={theme.colors.placeholder} style={{ flex: 1, color: theme.colors.text, paddingVertical: 10, fontSize: 14 }} /><Pressable onPress={apply} disabled={!url.trim()} style={{ borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: url.trim() ? theme.colors.accent : theme.colors.border }}><Text style={{ color: url.trim() ? theme.colors.onAccent : theme.colors.textSecondary, fontWeight: "700", fontSize: 13 }}>Add</Text></Pressable></View> : <ImageProviderPicker theme={theme} providers={providers} onSelect={(value) => editor.updateBlock(blockId, { props: { url: value } })} />}
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
