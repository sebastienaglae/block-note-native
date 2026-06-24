import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Keyboard, Platform, ScrollView, View } from "react-native";
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
import { I18nProvider, type TFunction } from "../i18n/I18nContext";
import { IconsProvider, type IconOverrides } from "../icons/IconContext";
import type { BlockRenderer, InlineRenderer, MentionUser, SlashMenuItem } from "../types";

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
  /**
   * People available for @-mentions. Typing `@` opens a typeahead filtered by
   * name; choosing one inserts a highlighted `mention` inline content node.
   */
  people?: MentionUser[];
  /**
   * Builds the inline content inserted when a person is chosen from the @-menu.
   * Defaults to a `mention` inline with `props.user` / `props.id` and the
   * visible text `@Name`. Override to match your own inline spec.
   */
  renderMention?: (user: MentionUser) => Parameters<Editor["insertInlineContent"]>[0];
  /** Show the Notion-style page header (icon + cover + fixed title). Default true. */
  showPageHeader?: boolean;
  /** Called when a pageLink block is opened. */
  onOpenPage?: (pageId: string) => void;
  /** Translate function: (key, englishFallback) => string. */
  t?: TFunction;
  /** Override any named icon with your own component. */
  icons?: IconOverrides;
  /** Outer style for the editor container. */
  style?: object;
}

/** Default @-mention insertion: a `mention` inline carrying the user id + name. */
function defaultRenderMention(user: MentionUser): Parameters<Editor["insertInlineContent"]>[0] {
  return [
    { type: "mention", props: { id: user.id, user: user.name }, content: [{ type: "text", text: `@${user.name}`, styles: {} }] },
    { type: "text", text: " ", styles: {} },
  ];
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
            people={props.people ?? []}
            renderMention={props.renderMention ?? defaultRenderMention}
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
  people,
  renderMention,
}: {
  editor: Editor;
  theme: Theme;
  style?: object;
  showPageHeader: boolean;
  people: MentionUser[];
  renderMention: (user: MentionUser) => Parameters<Editor["insertInlineContent"]>[0];
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
        people={people}
        renderMention={renderMention}
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

/** Builds @-mention menu items from the host's people list, filtered by query. */
function mentionItems(
  people: MentionUser[],
  query: string,
  renderMention: (user: MentionUser) => Parameters<Editor["insertInlineContent"]>[0],
): SlashMenuItem[] {
  const q = query.toLowerCase();
  return people
    .filter((p) => !q || p.name.toLowerCase().includes(q))
    .slice(0, 50)
    .map((p) => ({
      key: `mention:${p.id}`,
      title: p.name,
      subtitle: p.subtitle,
      emoji: p.avatar ? undefined : "@",
      group: "People",
      execute: (ed: Editor) => ed.insertInlineContent(renderMention(p)),
    }));
}

function EditorContent({
  editor,
  theme,
  style,
  showPageHeader,
  people,
  renderMention,
}: {
  editor: Editor;
  theme: Theme;
  style?: object;
  showPageHeader: boolean;
  people: MentionUser[];
  renderMention: (user: MentionUser) => Parameters<Editor["insertInlineContent"]>[0];
}): JSX.Element {
  const { slashItems } = useBnn();
  const dnd = useDnd();
  const scrollRef = useRef<ScrollView | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const [slashPos, setSlashPos] = useState<{ top: number; left: number } | null>(null);
  const [emoji, setEmoji] = useState<{ top: number; left: number } | null>(null);
  const [kbHeight, setKbHeight] = useState(0);
  const viewportH = useRef(0);
  const scrollY = useRef(0);

  const sel = editor.selection;

  // Track the on-screen keyboard height (native) so we can pad + scroll the
  // focused block into view; on web these listeners never fire.
  useEffect(() => {
    if (Platform.OS === "web") return;
    const show = Keyboard.addListener("keyboardDidShow", (e) => setKbHeight(e.endCoordinates?.height ?? 0));
    const hide = Keyboard.addListener("keyboardDidHide", () => {
      setKbHeight(0);
      // Collapse a range selection so both our toolbar and Android's own
      // copy/paste selection bar go away when editing ends.
      const s = editor.selection;
      if (s && s.start !== s.end) editor.setSelection({ blockId: s.blockId, start: s.end, end: s.end });
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [editor]);

  // Derive trigger-menu state from the current selection. A "/" opens the block
  // slash menu; an "@" opens the people typeahead (when people are provided).
  let trigger: { kind: "slash" | "mention"; query: string; start: number; blockId: string } | null = null;
  if (sel && sel.start === sel.end) {
    const block = editor.getBlock(sel.blockId);
    if (block && block.content && block.type !== "codeBlock") {
      const before = inlineToString(block.content).slice(0, sel.start);
      const ms = /(^|\s)\/(\S*)$/.exec(before);
      if (ms) {
        trigger = { kind: "slash", query: ms[2], start: sel.start - ms[2].length - 1, blockId: sel.blockId };
      } else if (people.length > 0) {
        const mm = /(^|\s)@(\S*)$/.exec(before);
        if (mm) trigger = { kind: "mention", query: mm[2], start: sel.start - mm[2].length - 1, blockId: sel.blockId };
      }
    }
  }
  const slashKey = trigger ? `${trigger.kind}:${trigger.blockId}:${trigger.start}` : null;
  const slashVisible = !!trigger && dismissedKey !== slashKey;
  const filtered =
    slashVisible && trigger
      ? trigger.kind === "slash"
        ? slashItems.filter((it) => matchesQuery(it, trigger!.query))
        : mentionItems(people, trigger.query, renderMention)
      : [];

  // Keep refs for the global keydown handler.
  const refs = useRef({ slashVisible, filtered, activeIndex, slash: trigger, sel });
  refs.current = { slashVisible, filtered, activeIndex, slash: trigger, sel };

  useEffect(() => setActiveIndex(0), [trigger?.query, slashKey]);

  // Position the slash menu near the caret, flipping above when low on space (#8).
  const MENU_H = 340;
  const computeSlashPos = () => {
    if (Platform.OS !== "web") return;
    const s = window.getSelection?.();
    if (!s || s.rangeCount === 0) return;
    const rect = s.getRangeAt(0).getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0 && rect.top === 0) return;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < MENU_H && rect.top > spaceBelow;
    setSlashPos({
      top: openUp ? Math.max(8, rect.top - MENU_H - 6) : rect.bottom + 6,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 290)),
    });
  };

  useLayoutEffect(() => {
    // Native has no DOM window/addEventListener; the menu uses absolute positioning.
    if (Platform.OS !== "web") return;
    if (!slashVisible) {
      setSlashPos(null);
      return;
    }
    computeSlashPos();
    // Scrolling the page dismisses the open component menu (the caret moves with
    // the content, so the menu would otherwise drift); resize just repositions.
    const onScroll = () => {
      if (slashKey) setDismissedKey(slashKey);
      setEmoji(null);
    };
    const onResize = () => computeSlashPos();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          if (r.slash) setDismissedKey(`${r.slash.kind}:${r.slash.blockId}:${r.slash.start}`);
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

  // Native: when the keyboard is open, scroll the focused block into the visible
  // area above it so you can always see what you're typing (incl. the last block).
  useEffect(() => {
    if (Platform.OS === "web" || !sel || kbHeight === 0 || viewportH.current === 0) return;
    const rect = dnd.blockContentRect(sel.blockId);
    if (!rect) return;
    const margin = 16;
    const visibleBottom = scrollY.current + viewportH.current - kbHeight - margin;
    const blockBottom = rect.top + rect.height;
    if (blockBottom > visibleBottom) {
      scrollRef.current?.scrollTo({ y: blockBottom - (viewportH.current - kbHeight) + margin, animated: true });
    } else if (rect.top < scrollY.current + margin) {
      scrollRef.current?.scrollTo({ y: Math.max(0, rect.top - margin), animated: true });
    }
  }, [sel?.blockId, sel?.start, sel?.end, kbHeight, dnd]);

  // On native the bar lives above the keyboard, so hide it once the keyboard is
  // dismissed (otherwise it lingers with no way to tap it away).
  const toolbarVisible =
    !!sel &&
    sel.start !== sel.end &&
    !slashVisible &&
    sel.blockId !== TITLE_BLOCK_ID &&
    !editor.locked &&
    (Platform.OS === "web" || kbHeight > 0);
  const selectionKey = sel ? `${sel.blockId}:${sel.start}:${sel.end}` : "none";

  let counter = 0;

  const content = (
    <View style={[{ flex: 1, backgroundColor: theme.colors.background }, style]}>
      <View style={{ flex: 1, flexDirection: "row" }}>
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onScroll={(e) => {
            scrollY.current = e.nativeEvent.contentOffset.y;
            dnd.setScrollOffset(e.nativeEvent.contentOffset.y);
          }}
          // A user-driven scroll closes the open component menu (#7). Using
          // begin-drag (not onScroll) avoids the keyboard auto-scroll dismissing it.
          onScrollBeginDrag={() => {
            if (slashKey) setDismissedKey(slashKey);
            setEmoji(null);
          }}
          scrollEventThrottle={16}
          onLayout={(e) => {
            viewportH.current = e.nativeEvent.layout.height;
            const node = scrollRef.current as { measureInWindow?: (cb: (x: number, y: number) => void) => void } | null;
            node?.measureInWindow?.((_x, y) => dnd.setContainerOffset(y));
          }}
          contentContainerStyle={{ paddingBottom: 24 + kbHeight }}
        >
          {showPageHeader ? <PageHeader editor={editor} theme={theme} locked={editor.locked} /> : null}
          <View
            onLayout={(e) => dnd.setBlocksOffset(e.nativeEvent.layout.y)}
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
      </View>

      <FormattingToolbar
        editor={editor}
        theme={theme}
        visible={toolbarVisible}
        selectionKey={selectionKey}
        nativeBottom={kbHeight}
      />
      {slashVisible ? (
        <SlashMenu
          theme={theme}
          items={filtered}
          activeIndex={activeIndex}
          position={slashPos}
          query={trigger?.query ?? ""}
          onSelect={selectItem}
          onHover={setActiveIndex}
        />
      ) : null}
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

  return content;
}
