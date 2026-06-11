/** Web embed: an iframe (url or inline html). Used by Vite web and Expo web. */
export interface EmbedProps {
  src?: string;
  html?: string;
  height?: number;
  title?: string;
  /** Background shown behind the iframe. Defaults to black. */
  background?: string;
  /** Ignored on web (native uses it to make embeds display-only). */
  interactive?: boolean;
  /** Ignored on web. */
  userAgent?: string;
}

export function Embed({ src, html, height = 320, title = "embed", background = "#000" }: EmbedProps): JSX.Element {
  const style = { width: "100%", height, border: "0", borderRadius: 8, backgroundColor: background } as const;
  if (html) return <iframe title={title} srcDoc={html} style={style} />;
  return <iframe title={title} src={src} allowFullScreen loading="lazy" style={style} />;
}
