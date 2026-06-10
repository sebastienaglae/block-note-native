import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  BlockNoteView,
  darkTheme,
  lightTheme,
  useCreateEditor,
  useEditorState,
} from "@bnn/react";
import { demoInitialContent, demoSchema } from "@bnn/demo-shared";

export default function App() {
  const [dark, setDark] = useState(false);
  const theme = dark ? darkTheme : lightTheme;

  const editor = useCreateEditor({
    initialContent: demoInitialContent,
    blockSpecs: demoSchema.blockSpecs,
    inlineSpecs: demoSchema.inlineSpecs,
  });
  useEditorState(editor);

  const HeaderButton = ({ label, onPress }: { label: string; onPress: () => void }) => (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: theme.colors.border,
      }}
    >
      <Text style={{ color: theme.colors.text, fontSize: 13, fontWeight: "500" }}>{label}</Text>
    </Pressable>
  );

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <StatusBar style={dark ? "light" : "dark"} />
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: "700", color: theme.colors.text }}>BlockNote Native</Text>
          <View style={{ flex: 1 }} />
          <HeaderButton label="↶" onPress={() => editor.undo()} />
          <HeaderButton label="↷" onPress={() => editor.redo()} />
          <HeaderButton label={dark ? "☀" : "🌙"} onPress={() => setDark((d) => !d)} />
        </View>

        <BlockNoteView
          editor={editor}
          theme={theme}
          blockRenderers={demoSchema.blockRenderers}
          inlineRenderers={demoSchema.inlineRenderers}
          slashItems={demoSchema.slashItems}
          style={{ flex: 1 }}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
