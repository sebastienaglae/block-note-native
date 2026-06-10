import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Platform, ScrollView, View } from "react-native";
import {
  inlineToString,
  spliceInline,
  type Editor,
} from "@sebastienaglae/bnn-core";
import { BnnProvider, useBnn } from "../context";
import { DndProvider, useDnd } from "../dnd/DndContext";
import { useEditorState } from "../hooks/useEditor";
import { lightTheme, withAccent, withFont, type FontChoice, type Theme } from "../theme/theme";
import { TITLE_BLOCK_ID } from "@sebastienaglae/bnn-core";
import { BlockComponent } from "./BlockComponent";
import { PageHeader } from "./PageHeader";
import { FormattingToolbar } from "../ui/FormattingToolbar";
import { SlashMenu } from "../ui/SlashMenu";
import { EmojiPicker } from "../ui/EmojiPicker";
import { CommentsPanel } from "../ui/CommentsPanel";
import { CommentsProvider } from "../comments/CommentsContext";
import { I18nProvider, type TFunction } from "../i18n/I18nContext";
import { IconsProvider, type IconOverrides } from "../icons/IconContext";
import type { BlockRenderer, InlineRenderer, SlashMenuItem } from "../types";

export interface BlockNoteViewProps {
  editor: Editor;
  theme?: Theme;
  /** Custom accent color (any hex/CSS color). Drives accent / soft / selection tints. */
  accentColor?: string;
  /** Body font for the whole editor. */
  font?: FontChoice;
  blockRenderers?: Record<string, BlockRenderer>;
  inlineRenderers?: Record<string, InlineRenderer>;
  slashItems?: SlashMenuItem[];
  /** Show the Notion-style page header (icon + cover + fixed title). Default true. */
  showPageHeader?: boolean;
  /** Called when a pageLink block is opened. */
  onOpenPage?: (pageId: string) => void;
  /** Enable the comments UI (side-menu button + thread panel). Default true. */
  enableComments?: boolean;
  /**
   * When set, clicking a block's comment button calls this instead of opening the
   * built-in panel — render your own <CommentsPanel> wherever you like (#9).
   */
  onCommentRequested?: (blockId: string) => void;
  /** Display name used for new comments. */
  commentAuthor?: string;
  /** Translate function: (key, englishFallback) => string. */
  t?: TFunction;
  /** Override any named icon with your own component. */
  icons?: IconOverrides;
  /** Outer style for the editor container. */
  style?: object;
}

export function BlockNoteView(props: BlockNoteViewProps): JSX.Element {
  const theme = withFont(withAccent(props.theme ?? lightTheme, props.accentColor), props.font);
  return (
    <I18nProvider t={props.t}>
      <IconsProvider icons={props.icons}>
        <BnnProvider
          editor={props.editor}
          theme={theme}
          blockRenderers={props.blockRenderers}
          inlineRenderers={props.inlineRenderers}
          slashItems={props.slashItems}
          onOpenPage={props.onOpenPage}
        >
          <EditorInner
            editor={props.editor}
            theme={theme}
            style={props.style}
            showPageHeader={props.showPageHeader ?? true}
            enableComments={props.enableComments ?? true}
            onCommentRequested={props.onCommentRequested}
            commentAuthor={props.commentAuthor}
          />
        </BnnProvider>
      </IconsProvider>
    </I18nProvider>
  );
}

function EditorInner({
  editor,
  theme,
  style,
  showPageHeader,
  enableComments,
  onCommentRequested,
  commentAuthor,
}: {
  editor: Editor;
  theme: Theme;
  style?: object;
  showPageHeader: boolean;
  enableComments: boolean;
  onCommentRequested?: (blockId: string) => void;
  commentAuthor?: string;
}): JSX.Element {
  useEditorState(editor);
  const { layouts } = useBnn();
  const topLevelIds = editor.document.map((b) => b.id);
  return (
    <DndProvider editor={editor} topLevelIds={topLevelIds} layouts={layouts}>
      <EditorContent
        editor={editor}
        theme={theme}
        style={style}
        showPageHeader={showPageHeader}
        enableComments={enableComments}
        onCommentRequested={onCommentRequested}
        commentAuthor={commentAuthor}
      />
    </DndProvider>
  );
}

function matchesQuery(item: SlashMenuItem, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  if (item.title.toLowerCase().includes(q)) return true;
  return (item.aliases ?? []).some((a) => a.toLowerCase().includes(q));
}

function EditorContent({
  editor,
  theme,
  style,
  showPageHeader,
  enableComments,
  onCommentRequested,
  commentAuthor,
}: {
  editor: Editor;
  theme: Theme;
  style?: object;
  showPageHeader: boolean;
  enableComments: boolean;
  onCommentRequested?: (blockId: string) => void;
  commentAuthor?: string;
}): JSX.Element {
  const { slashItems } = useBnn();
  const dnd = useDnd();
  const scrollRef = useRef<ScrollView | null>(null);
  const [commentBlockId, setCommentBlockId] = useState<string | null>(null);
  const openComments = onCommentRequested ?? setCommentBlockId;
  const [activeIndex, setActiveIndex] = useState(0);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const [slashPos, setSlashPos] = useState<{ top: number; left: number } | null>(null);
  const [emoji, setEmoji] = useState<{ top: number; left: number } | null>(null);

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
    if (item.kind === "emoji") {
      setEmoji(slashPos ?? { top: 120, left: 120 });
      return;
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

  const toolbarVisible =
    !!sel && sel.start !== sel.end && !slashVisible && sel.blockId !== TITLE_BLOCK_ID && !editor.locked;
  const selectionKey = sel ? `${sel.blockId}:${sel.start}:${sel.end}` : "none";

  let counter = 0;

  const content = (
    <View style={[{ flex: 1, backgroundColor: theme.colors.background }, style]}>
      <View style={{ flex: 1, flexDirection: "row" }}>
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          onScroll={(e) => dnd.setScrollOffset(e.nativeEvent.contentOffset.y)}
          scrollEventThrottle={16}
          onLayout={() => {
            const node = scrollRef.current as { measureInWindow?: (cb: (x: number, y: number) => void) => void } | null;
            node?.measureInWindow?.((_x, y) => dnd.setContainerOffset(y));
          }}
          contentContainerStyle={{ paddingBottom: 80 }}
        >
          {showPageHeader ? <PageHeader editor={editor} theme={theme} locked={editor.locked} /> : null}
          <View
            style={{
              width: "100%",
              maxWidth: 740,
              alignSelf: "center",
              paddingHorizontal: 16,
              paddingTop: showPageHeader ? 6 : 24,
            }}
          >
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

        {enableComments && !onCommentRequested && commentBlockId ? (
          <CommentsPanel
            editor={editor}
            theme={theme}
            blockId={commentBlockId}
            author={commentAuthor}
            onClose={() => setCommentBlockId(null)}
          />
        ) : null}
      </View>

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
      {emoji ? (
        <View
          style={
            Platform.OS === "web"
              ? ({ position: "fixed", top: emoji.top, left: emoji.left, zIndex: 1000 } as object)
              : ({ position: "absolute", top: 60, left: 16, zIndex: 1000 } as object)
          }
        >
          <EmojiPicker
            theme={theme}
            onSelect={(e) => {
              editor.insertInlineContent(e);
              setEmoji(null);
            }}
          />
        </View>
      ) : null}
    </View>
  );

  if (!enableComments) return content;
  return (
    <CommentsProvider value={{ openComments, activeBlockId: commentBlockId }}>
      {content}
    </CommentsProvider>
  );
}
