import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Platform, ScrollView, View } from "react-native";
import {
  inlineToString,
  spliceInline,
  type Editor,
} from "@bnn/core";
import { BnnProvider, useBnn } from "../context";
import { DndProvider, useDnd } from "../dnd/DndContext";
import { useEditorState } from "../hooks/useEditor";
import { lightTheme, type Theme } from "../theme/theme";
import { BlockComponent } from "./BlockComponent";
import { FormattingToolbar } from "../ui/FormattingToolbar";
import { SlashMenu } from "../ui/SlashMenu";
import type { BlockRenderer, InlineRenderer, SlashMenuItem } from "../types";

export interface BlockNoteViewProps {
  editor: Editor;
  theme?: Theme;
  blockRenderers?: Record<string, BlockRenderer>;
  inlineRenderers?: Record<string, InlineRenderer>;
  slashItems?: SlashMenuItem[];
  /** Outer style for the editor container. */
  style?: object;
}

export function BlockNoteView(props: BlockNoteViewProps): JSX.Element {
  const theme = props.theme ?? lightTheme;
  return (
    <BnnProvider
      editor={props.editor}
      theme={theme}
      blockRenderers={props.blockRenderers}
      inlineRenderers={props.inlineRenderers}
      slashItems={props.slashItems}
    >
      <EditorInner editor={props.editor} theme={theme} style={props.style} />
    </BnnProvider>
  );
}

function EditorInner({ editor, theme, style }: { editor: Editor; theme: Theme; style?: object }): JSX.Element {
  useEditorState(editor);
  const { layouts } = useBnn();
  const topLevelIds = editor.document.map((b) => b.id);
  return (
    <DndProvider editor={editor} topLevelIds={topLevelIds} layouts={layouts}>
      <EditorContent editor={editor} theme={theme} style={style} />
    </DndProvider>
  );
}

function matchesQuery(item: SlashMenuItem, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  if (item.title.toLowerCase().includes(q)) return true;
  return (item.aliases ?? []).some((a) => a.toLowerCase().includes(q));
}

function EditorContent({ editor, theme, style }: { editor: Editor; theme: Theme; style?: object }): JSX.Element {
  const { slashItems } = useBnn();
  const dnd = useDnd();
  const scrollRef = useRef<ScrollView | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const [slashPos, setSlashPos] = useState<{ top: number; left: number } | null>(null);

  const sel = editor.selection;

  // Derive slash-menu state from the current selection.
  let slash: { query: string; start: number; blockId: string } | null = null;
  if (sel && sel.start === sel.end) {
    const block = editor.getBlock(sel.blockId);
    if (block && block.content && block.type !== "codeBlock") {
      const before = inlineToString(block.content).slice(0, sel.start);
      const m = /(^|\s)\/(\S*)$/.exec(before);
      if (m) slash = { query: m[2], start: sel.start - m[2].length - 1, blockId: sel.blockId };
    }
  }
  const slashKey = slash ? `${slash.blockId}:${slash.start}` : null;
  const slashVisible = !!slash && dismissedKey !== slashKey;
  const filtered = slashVisible && slash ? slashItems.filter((it) => matchesQuery(it, slash!.query)) : [];

  // Keep refs for the global keydown handler.
  const refs = useRef({ slashVisible, filtered, activeIndex, slash, sel });
  refs.current = { slashVisible, filtered, activeIndex, slash, sel };

  useEffect(() => setActiveIndex(0), [slash?.query, slashKey]);

  // Position the slash menu below the caret (web).
  useLayoutEffect(() => {
    if (Platform.OS !== "web" || !slashVisible) {
      setSlashPos(null);
      return;
    }
    const s = window.getSelection?.();
    if (!s || s.rangeCount === 0) return;
    const rect = s.getRangeAt(0).getBoundingClientRect();
    setSlashPos({
      top: Math.min(rect.bottom + 6, window.innerHeight - 330),
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 270)),
    });
  }, [slashVisible, slashKey, activeIndex]);

  const selectItem = (item: SlashMenuItem) => {
    const s = refs.current.slash;
    const curSel = editor.selection;
    if (!s || !curSel) return;
    const block = editor.getBlock(s.blockId);
    if (block && block.content) {
      const stripped = spliceInline(block.content, s.start, curSel.start, []);
      editor.updateBlock(s.blockId, { content: stripped });
      editor.setSelection({ blockId: s.blockId, start: s.start, end: s.start });
    }
    item.execute(editor, s.blockId);
  };

  // Global keyboard (web): slash navigation + formatting/undo shortcuts.
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const handler = (e: KeyboardEvent) => {
      const r = refs.current;
      if (r.slashVisible && r.filtered.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          e.stopPropagation();
          setActiveIndex((i) => Math.min(r.filtered.length - 1, i + 1));
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          e.stopPropagation();
          setActiveIndex((i) => Math.max(0, i - 1));
          return;
        }
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          e.stopPropagation();
          selectItem(r.filtered[Math.min(r.activeIndex, r.filtered.length - 1)]);
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          if (r.slash) setDismissedKey(`${r.slash.blockId}:${r.slash.start}`);
          return;
        }
      }
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        editor.undo();
      } else if ((key === "z" && e.shiftKey) || key === "y") {
        e.preventDefault();
        editor.redo();
      } else if (key === "b") {
        e.preventDefault();
        editor.toggleStyles({ bold: true });
      } else if (key === "i") {
        e.preventDefault();
        editor.toggleStyles({ italic: true });
      } else if (key === "u") {
        e.preventDefault();
        editor.toggleStyles({ underline: true });
      } else if (key === "e") {
        e.preventDefault();
        editor.toggleStyles({ code: true });
      }
    };
    // Capture phase so we intercept before the contentEditable handles the key.
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [editor]);

  const toolbarVisible = !!sel && sel.start !== sel.end && !slashVisible;
  const selectionKey = sel ? `${sel.blockId}:${sel.start}:${sel.end}` : "none";

  let counter = 0;

  return (
    <View style={[{ flex: 1, backgroundColor: theme.colors.background }, style]}>
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        onScroll={(e) => dnd.setScrollOffset(e.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
        onLayout={() => {
          // Measure the viewport's screen offset for drag hit-testing.
          const node = scrollRef.current as { measureInWindow?: (cb: (x: number, y: number) => void) => void } | null;
          node?.measureInWindow?.((_x, y) => dnd.setContainerOffset(y));
        }}
        contentContainerStyle={{ paddingVertical: 24 }}
      >
        <View style={{ width: "100%", maxWidth: 740, alignSelf: "center", paddingHorizontal: 16 }}>
          {editor.document.map((block) => {
            const idx = block.type === "numberedListItem" ? ++counter : (counter = 0);
            return (
              <BlockComponent
                key={block.id}
                block={block}
                editor={editor}
                depth={0}
                listIndex={block.type === "numberedListItem" ? idx : undefined}
              />
            );
          })}
        </View>
      </ScrollView>

      <FormattingToolbar editor={editor} theme={theme} visible={toolbarVisible} selectionKey={selectionKey} />
      <SlashMenu
        theme={theme}
        items={filtered}
        activeIndex={activeIndex}
        position={slashPos}
        query={slash?.query ?? ""}
        onSelect={selectItem}
        onHover={setActiveIndex}
      />
    </View>
  );
}
