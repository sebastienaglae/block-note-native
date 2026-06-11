/** Web audio player (accent play button + seekable progress). Uses a DOM <audio>. */
import { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { Theme } from "../../theme/theme";
import { Icon } from "../../icons/Icon";

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
