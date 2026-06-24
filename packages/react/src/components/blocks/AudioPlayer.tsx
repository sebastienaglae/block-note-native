/** Web audio player (accent play button + draggable seek bar). Uses a DOM <audio>. */
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { Theme } from "../../theme/theme";
import { Icon } from "../../icons/Icon";

export function AudioPlayer({ url, theme }: { url: string; theme: Theme }): JSX.Element {
  const ref = useRef<HTMLAudioElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);

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

  const seekToClientX = (clientX: number) => {
    const el = barRef.current;
    const a = ref.current;
    if (!el || !a || !dur) return;
    const r = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - r.left) / (r.width || 1)));
    a.currentTime = ratio * dur;
    setCur(ratio * dur);
  };

  // Drag-to-scrub: track the pointer on the whole window once a drag starts so it
  // keeps seeking even when the cursor leaves the bar.
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (draggingRef.current) seekToClientX(e.clientX);
    };
    const onUp = () => {
      draggingRef.current = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dur]);

  const pct = dur ? Math.min(1, cur / dur) : 0;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: theme.colors.backgroundSecondary, borderRadius: theme.radius, borderWidth: 1, borderColor: theme.colors.border, paddingVertical: 10, paddingHorizontal: 12 }}>
      <Pressable onPress={toggle} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: theme.colors.accent, alignItems: "center", justifyContent: "center" }}>
        <Icon name={playing ? "pause" : "play"} size={16} color={theme.colors.onAccent} fill={theme.colors.onAccent} />
      </Pressable>
      {/* Native DOM bar (this file is web-only) so we get real pointer drag events. */}
      <div
        ref={barRef}
        onMouseDown={(e) => {
          draggingRef.current = true;
          seekToClientX(e.clientX);
          e.preventDefault();
        }}
        style={{ flex: 1, paddingTop: 8, paddingBottom: 8, cursor: "pointer" }}
      >
        <div style={{ position: "relative", height: 5, borderRadius: 3, backgroundColor: theme.colors.border }}>
          <div style={{ width: `${pct * 100}%`, height: 5, borderRadius: 3, backgroundColor: theme.colors.accent }} />
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: `${pct * 100}%`,
              width: 12,
              height: 12,
              marginLeft: -6,
              marginTop: -6,
              borderRadius: 6,
              backgroundColor: theme.colors.accent,
              boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
            }}
          />
        </div>
      </div>
      <Text style={{ fontSize: 11, color: theme.colors.textSecondary, fontVariant: ["tabular-nums"] }}>
        {fmt(cur)} / {fmt(dur || 0)}
      </Text>
      <audio
        ref={ref}
        src={url}
        onTimeUpdate={() => {
          if (!draggingRef.current) setCur(ref.current?.currentTime || 0);
        }}
        onLoadedMetadata={() => setDur(ref.current?.duration || 0)}
        onEnded={() => setPlaying(false)}
        style={{ display: "none" }}
      />
    </View>
  );
}
