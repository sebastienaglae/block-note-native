/** Native embed: a react-native-webview WebView (url or inline html). iOS / Android only. */
import { View } from "react-native";
import { WebView } from "react-native-webview";

export interface EmbedProps {
  src?: string;
  html?: string;
  height?: number;
  title?: string;
  /** Background shown behind the WebView (e.g. while loading). Defaults to black. */
  background?: string;
  /**
   * When true (default) the WebView claims touches so it can be interacted with
   * (video controls). When false it's display-only and lets the page scroll over it
   * (static map). When 0, the embed is rendered off-screen (audio engine).
   */
  interactive?: boolean;
  /** Mobile UA helps some providers (e.g. YouTube) serve an embeddable player. */
  userAgent?: string;
}

export function Embed({ src, html, height = 320, background = "#000", interactive = true, userAgent }: EmbedProps): JSX.Element {
  return (
    // For interactive embeds, capture the touch so the parent editor ScrollView
    // doesn't steal it; for static embeds, let touches fall through to the page.
    <View
      onStartShouldSetResponderCapture={interactive ? () => true : undefined}
      style={{ height, borderRadius: 8, overflow: "hidden", backgroundColor: background }}
    >
      <WebView
        source={html ? { html } : { uri: src ?? "" }}
        style={{ flex: 1, backgroundColor: background }}
        pointerEvents={interactive ? "auto" : "none"}
        nestedScrollEnabled
        allowsInlineMediaPlayback
        allowsFullscreenVideo
        javaScriptEnabled
        domStorageEnabled
        mediaPlaybackRequiresUserAction={false}
        originWhitelist={["*"]}
        userAgent={userAgent}
      />
    </View>
  );
}
