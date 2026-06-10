import { useEffect, useState } from "react";
import {
  BlockNoteView,
  Pressable,
  ScrollView,
  Text,
  View,
  blocksToJSON,
  blocksToMarkdown,
  darkTheme,
  jsonToBlocks,
  lightTheme,
  useCreateEditor,
  useEditorState,
  type PartialBlock,
} from "@bnn/react";
import { demoInitialContent, demoSchema } from "@bnn/demo-shared";

const STORAGE_KEY = "bnn-web-doc";

function loadInitial(): PartialBlock[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return jsonToBlocks(saved);
  } catch {
    /* ignore */
  }
  return demoInitialContent;
}

type Preview = "none" | "json" | "markdown";

export function App(): JSX.Element {
  const [dark, setDark] = useState(false);
  const [preview, setPreview] = useState<Preview>("none");
  const theme = dark ? darkTheme : lightTheme;

  const editor = useCreateEditor({
    initialContent: loadInitial(),
    blockSpecs: demoSchema.blockSpecs,
    inlineSpecs: demoSchema.inlineSpecs,
  });
  const version = useEditorState(editor);

  // Expose for debugging / automated verification in dev.
  useEffect(() => {
    (window as unknown as { __bnnEditor: typeof editor }).__bnnEditor = editor;
  }, [editor]);

  // Debounced persistence to localStorage.
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, blocksToJSON(editor.document));
      } catch {
        /* ignore */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [version, editor]);

  const previewText =
    preview === "json"
      ? blocksToJSON(editor.document)
      : preview === "markdown"
        ? blocksToMarkdown(editor.document)
        : "";

  const HeaderButton = ({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) => (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: active ? theme.colors.accent : theme.colors.border,
        backgroundColor: active ? theme.colors.accentSoft : "transparent",
      }}
    >
      <Text style={{ color: active ? theme.colors.accent : theme.colors.text, fontSize: 13, fontWeight: "500" }}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <View style={{ height: "100%", backgroundColor: theme.colors.background }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
          backgroundColor: theme.colors.background,
        }}
      >
        <Text style={{ fontSize: 15, fontWeight: "700", color: theme.colors.text }}>BlockNote Native</Text>
        <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>web demo</Text>
        <View style={{ flex: 1 }} />
        <HeaderButton label="Undo" onPress={() => editor.undo()} />
        <HeaderButton label="Redo" onPress={() => editor.redo()} />
        <HeaderButton label="JSON" active={preview === "json"} onPress={() => setPreview(preview === "json" ? "none" : "json")} />
        <HeaderButton label="Markdown" active={preview === "markdown"} onPress={() => setPreview(preview === "markdown" ? "none" : "markdown")} />
        <HeaderButton label={dark ? "☀ Light" : "🌙 Dark"} onPress={() => setDark((d) => !d)} />
        <HeaderButton
          label="Reset"
          onPress={() => {
            try {
              localStorage.removeItem(STORAGE_KEY);
            } catch {
              /* ignore */
            }
            editor.replaceDocument(demoInitialContent);
          }}
        />
      </View>

      <View style={{ flex: 1, flexDirection: "row" }}>
        <BlockNoteView
          editor={editor}
          theme={theme}
          blockRenderers={demoSchema.blockRenderers}
          inlineRenderers={demoSchema.inlineRenderers}
          slashItems={demoSchema.slashItems}
          style={{ flex: 1 }}
        />
        {preview !== "none" ? (
          <View
            style={{
              width: 380,
              borderLeftWidth: 1,
              borderLeftColor: theme.colors.border,
              backgroundColor: theme.colors.backgroundSecondary,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: theme.colors.textSecondary,
                paddingHorizontal: 14,
                paddingTop: 12,
                paddingBottom: 6,
                textTransform: "uppercase",
              }}
            >
              {preview} output
            </Text>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14 }}>
              <Text
                style={{
                  fontFamily: theme.monoFamily,
                  fontSize: 12,
                  lineHeight: 18,
                  color: theme.colors.text,
                }}
              >
                {previewText}
              </Text>
            </ScrollView>
          </View>
        ) : null}
      </View>
    </View>
  );
}
