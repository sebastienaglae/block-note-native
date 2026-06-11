/**
 * Native audio player. A plain WebView pointed at an audio URL renders nothing
 * usable on Android, so we drive a tiny hidden WebView `<audio>` element from
 * native React controls (accent play button + seekable bar + time) — a real
 * custom player with no extra native module to link.
 */
import { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import type { Theme } from "../../theme/theme";
import { Icon } from "../../icons/Icon";

export function AudioPlayer({ url, theme }: { url: string; theme: Theme }): JSX.Element {
  const ref = useRef<WebView | null>(null);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const [barW, setBarW] = useState(1);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor((s || 0) % 60)).padStart(2, "0")}`;
  const pct = dur ? Math.min(1, cur / dur) : 0;

  const html = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0"><audio id="a" src="${url.replace(/"/g, "&quot;")}" preload="metadata"></audio>
<script>
var a=document.getElementById('a');
function post(o){window.ReactNativeWebView.postMessage(JSON.stringify(o));}
a.addEventListener('timeupdate',function(){post({t:'time',cur:a.currentTime||0,dur:a.duration||0});});
a.addEventListener('loadedmetadata',function(){post({t:'time',cur:0,dur:a.duration||0});});
a.addEventListener('play',function(){post({t:'play'});});
a.addEventListener('pause',function(){post({t:'pause'});});
a.addEventListener('ended',function(){post({t:'end'});});
</script></body></html>`;

  const run = (js: string) => ref.current?.injectJavaScript(js + ";true;");
  const toggle = () => run(playing ? "document.getElementById('a').pause()" : "document.getElementById('a').play()");
  const seek = (x: number) => {
    const ratio = Math.max(0, Math.min(1, x / barW));
    run(`var _a=document.getElementById('a');_a.currentTime=${ratio}*( _a.duration||0)`);
  };

  return (
    <View style={{ position: "relative", alignSelf: "stretch", width: "100%", flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: theme.colors.backgroundSecondary, borderRadius: theme.radius, borderWidth: 1, borderColor: theme.colors.border, paddingVertical: 10, paddingHorizontal: 12 }}>
      <Pressable onPress={toggle} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: theme.colors.accent, alignItems: "center", justifyContent: "center" }}>
        <Icon name={playing ? "pause" : "play"} size={18} color={theme.colors.onAccent} fill={theme.colors.onAccent} />
      </Pressable>
      <Pressable
        style={{ flex: 1, paddingVertical: 8 }}
        onLayout={(e: { nativeEvent: { layout: { width: number } } }) => setBarW(e.nativeEvent.layout.width || 1)}
        onPress={(e?: { nativeEvent?: { locationX?: number } }) => seek(e?.nativeEvent?.locationX ?? 0)}
      >
        <View style={{ height: 6, borderRadius: 3, backgroundColor: theme.colors.border }}>
          <View style={{ width: `${pct * 100}%`, height: 6, borderRadius: 3, backgroundColor: theme.colors.accent }} />
        </View>
      </Pressable>
      <Text style={{ fontSize: 11, color: theme.colors.textSecondary }}>
        {fmt(cur)} / {fmt(dur)}
      </Text>
      {/* Hidden audio engine: kept 1×1 + transparent (not display:none) so Android keeps playing. */}
      <WebView
        ref={ref}
        source={{ html }}
        javaScriptEnabled
        domStorageEnabled
        mediaPlaybackRequiresUserAction={false}
        originWhitelist={["*"]}
        style={{ position: "absolute", width: 1, height: 1, opacity: 0 }}
        pointerEvents="none"
        onMessage={(e: { nativeEvent: { data: string } }) => {
          try {
            const d = JSON.parse(e.nativeEvent.data);
            if (d.t === "time") {
              setCur(d.cur || 0);
              if (d.dur) setDur(d.dur);
            } else if (d.t === "play") setPlaying(true);
            else if (d.t === "pause" || d.t === "end") setPlaying(false);
          } catch {
            /* ignore malformed messages */
          }
        }}
      />
    </View>
  );
}
