/** Web embed: an iframe (url or inline html). Used by Vite web and Expo web. */
export interface EmbedProps {
  src?: string;
  html?: string;
  height?: number;
  title?: string;
}

export function Embed({ src, html, height = 320, title = "embed" }: EmbedProps): JSX.Element {
  const style = { width: "100%", height, border: "0", borderRadius: 8, backgroundColor: "#000" } as const;
  if (html) return <iframe title={title} srcDoc={html} style={style} />;
  return <iframe title={title} src={src} allowFullScreen loading="lazy" style={style} />;
}
