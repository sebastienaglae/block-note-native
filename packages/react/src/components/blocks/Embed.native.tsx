/** Native embed: a react-native-webview WebView (url or inline html). iOS / Android only. */
import { View } from "react-native";
import { WebView } from "react-native-webview";

export interface EmbedProps {
  src?: string;
  html?: string;
  height?: number;
  title?: string;
}

export function Embed({ src, html, height = 320 }: EmbedProps): JSX.Element {
  return (
    <View style={{ height, borderRadius: 8, overflow: "hidden", backgroundColor: "#000" }}>
      <WebView
        source={html ? { html } : { uri: src ?? "" }}
        style={{ flex: 1, backgroundColor: "#000" }}
        allowsFullscreenVideo
        javaScriptEnabled
        domStorageEnabled
        mediaPlaybackRequiresUserAction
      />
    </View>
  );
}
