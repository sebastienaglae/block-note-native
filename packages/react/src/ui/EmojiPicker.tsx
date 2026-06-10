import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import type { Theme } from "../theme/theme";
import { useT } from "../i18n/I18nContext";

interface EmojiEntry {
  e: string;
  k: string; // space-separated keywords
}

const EMOJIS: EmojiEntry[] = [
  { e: "😀", k: "smile happy face grin" },
  { e: "😂", k: "laugh joy tears funny" },
  { e: "😍", k: "love heart eyes" },
  { e: "😎", k: "cool sunglasses" },
  { e: "🤔", k: "think hmm" },
  { e: "😅", k: "sweat nervous" },
  { e: "🙃", k: "upside silly" },
  { e: "😴", k: "sleep tired" },
  { e: "🥳", k: "party celebrate" },
  { e: "😭", k: "cry sad" },
  { e: "😡", k: "angry mad" },
  { e: "👍", k: "thumbs up yes good like" },
  { e: "👎", k: "thumbs down no bad" },
  { e: "👏", k: "clap applause" },
  { e: "🙏", k: "pray thanks please" },
  { e: "💪", k: "strong muscle" },
  { e: "🤝", k: "handshake deal" },
  { e: "👋", k: "wave hello hi" },
  { e: "✍️", k: "write note" },
  { e: "🔥", k: "fire hot lit" },
  { e: "⭐", k: "star favorite" },
  { e: "✨", k: "sparkles magic" },
  { e: "🎉", k: "party tada celebrate" },
  { e: "💡", k: "idea bulb tip light" },
  { e: "📌", k: "pin important" },
  { e: "📍", k: "location place map" },
  { e: "✅", k: "check done yes complete" },
  { e: "❌", k: "cross no wrong" },
  { e: "⚠️", k: "warning caution alert" },
  { e: "❓", k: "question help" },
  { e: "❗", k: "exclamation important" },
  { e: "📝", k: "memo note write doc" },
  { e: "📄", k: "page document file" },
  { e: "📁", k: "folder directory" },
  { e: "📊", k: "chart graph stats" },
  { e: "📈", k: "chart up growth" },
  { e: "📅", k: "calendar date" },
  { e: "🗓️", k: "calendar schedule" },
  { e: "⏰", k: "clock alarm time" },
  { e: "🎯", k: "target goal aim" },
  { e: "🚀", k: "rocket launch ship fast" },
  { e: "🛠️", k: "tools build fix" },
  { e: "⚙️", k: "gear settings config" },
  { e: "🔒", k: "lock secure private" },
  { e: "🔑", k: "key access" },
  { e: "💻", k: "laptop computer code" },
  { e: "📱", k: "phone mobile" },
  { e: "🌐", k: "globe web internet world" },
  { e: "📦", k: "package box ship" },
  { e: "🏠", k: "home house" },
  { e: "🏢", k: "office building work" },
  { e: "☕", k: "coffee break" },
  { e: "🍕", k: "pizza food" },
  { e: "🎵", k: "music note audio" },
  { e: "🎬", k: "movie film video" },
  { e: "📷", k: "camera photo image" },
  { e: "🖼️", k: "picture image art" },
  { e: "❤️", k: "heart love red" },
  { e: "💙", k: "heart blue" },
  { e: "💚", k: "heart green" },
  { e: "💜", k: "heart purple" },
  { e: "🧠", k: "brain mind smart" },
  { e: "👀", k: "eyes look watch" },
  { e: "🌟", k: "glowing star" },
  { e: "🌈", k: "rainbow" },
  { e: "🌍", k: "earth world globe" },
  { e: "🐛", k: "bug issue insect" },
  { e: "🦄", k: "unicorn magic" },
  { e: "🎨", k: "art palette design" },
  { e: "🔔", k: "bell notification" },
];

export interface EmojiPickerProps {
  theme: Theme;
  onSelect: (emoji: string) => void;
  onRemove?: () => void;
  width?: number;
}

export function EmojiPicker({ theme, onSelect, onRemove, width = 300 }: EmojiPickerProps): JSX.Element {
  const t = useT();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const filtered = q ? EMOJIS.filter((x) => x.k.includes(q)) : EMOJIS;

  return (
    <View
      style={{
        width,
        backgroundColor: theme.colors.menuBackground,
        borderRadius: theme.radius + 2,
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: 8,
        shadowColor: "#000",
        shadowOpacity: 0.18,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
        elevation: 8,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t("bnn.emoji.filter", "Filter…")}
          placeholderTextColor={theme.colors.placeholder}
          style={{
            flex: 1,
            paddingHorizontal: 8,
            paddingVertical: 6,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: theme.colors.border,
            color: theme.colors.text,
            backgroundColor: theme.colors.background,
          }}
        />
        {onRemove ? (
          <Pressable onPress={onRemove} style={{ paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6 }}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>{t("bnn.emoji.remove", "Remove")}</Text>
          </Pressable>
        ) : null}
      </View>
      <ScrollView style={{ maxHeight: 220 }} keyboardShouldPersistTaps="always">
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {filtered.map((x) => (
            <Pressable
              key={x.e}
              onPress={() => onSelect(x.e)}
              style={({ hovered }: { hovered?: boolean }) => ({
                width: 38,
                height: 38,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 6,
                backgroundColor: hovered ? theme.colors.menuHover : "transparent",
              })}
            >
              <Text style={{ fontSize: 22 }}>{x.e}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
