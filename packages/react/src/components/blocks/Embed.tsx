/** Web embed: an iframe. Used by Vite web and Expo web. */
export interface EmbedProps {
  src: string;
  height?: number;
  title?: string;
}

export function Embed({ src, height = 320, title = "embed" }: EmbedProps): JSX.Element {
  return (
    <iframe
      title={title}
      src={src}
      allowFullScreen
      loading="lazy"
      style={{ width: "100%", height, border: "0", borderRadius: 8, backgroundColor: "#000" }}
    />
  );
}
