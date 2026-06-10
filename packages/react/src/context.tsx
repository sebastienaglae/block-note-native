import { createContext, useContext, useMemo, useRef, type ReactNode } from "react";
import type { Editor } from "@bnn/core";
import type { Theme } from "./theme/theme";
import type { BlockRenderer, InlineRenderer, SlashMenuItem } from "./types";
import { defaultBlockRenderers } from "./components/blocks/defaultBlocks";
import { defaultSlashItems } from "./ui/defaultSlashItems";

export interface BlockLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BnnContextValue {
  editor: Editor;
  theme: Theme;
  blockRenderers: Record<string, BlockRenderer>;
  inlineRenderers: Record<string, InlineRenderer>;
  slashItems: SlashMenuItem[];
  layouts: React.MutableRefObject<Map<string, BlockLayout>>;
  setLayout: (id: string, layout: BlockLayout | null) => void;
}

const BnnContext = createContext<BnnContextValue | null>(null);

export function useBnn(): BnnContextValue {
  const ctx = useContext(BnnContext);
  if (!ctx) throw new Error("useBnn must be used within <BlockNoteView>");
  return ctx;
}

export interface BnnProviderProps {
  editor: Editor;
  theme: Theme;
  blockRenderers?: Record<string, BlockRenderer>;
  inlineRenderers?: Record<string, InlineRenderer>;
  slashItems?: SlashMenuItem[];
  children: ReactNode;
}

export function BnnProvider(props: BnnProviderProps): JSX.Element {
  const { editor, theme, children } = props;
  const layouts = useRef<Map<string, BlockLayout>>(new Map());

  const value = useMemo<BnnContextValue>(
    () => ({
      editor,
      theme,
      blockRenderers: { ...defaultBlockRenderers, ...(props.blockRenderers ?? {}) },
      inlineRenderers: { ...(props.inlineRenderers ?? {}) },
      slashItems: props.slashItems ?? defaultSlashItems,
      layouts,
      setLayout: (id, layout) => {
        if (layout) layouts.current.set(id, layout);
        else layouts.current.delete(id);
      },
    }),
    [editor, theme, props.blockRenderers, props.inlineRenderers, props.slashItems],
  );

  return <BnnContext.Provider value={value}>{children}</BnnContext.Provider>;
}
