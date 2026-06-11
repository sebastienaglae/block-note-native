import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  BlockNoteView,
  CommentsPanel,
  Icon,
  PageTree,
  createId,
  darkTheme,
  inlineToString,
  lightTheme,
  useCreateEditor,
  useEditorState,
  withAccent,
  type Comment,
  type DropPosition,
  type FontChoice,
  type PageNode,
  type PartialBlock,
} from "@sebastienaglae/bnn-react";
import { allElementsContent, demoInitialContent, demoSchema } from "@sebastienaglae/bnn-demo-shared";

// Page-level comments live under this key in the page's comment map.
const PAGE_COMMENTS = "__page__";
const ACCENTS = ["#2383e2", "#e03e3e", "#d9730d", "#0f9d58", "#9065b0", "#c14c8a"];

interface PageDoc {
  meta: { icon?: string; cover?: string; title?: PartialBlock["content"] };
  blocks: PartialBlock[];
  comments: Record<string, Comment[]>;
}

// ---- tree helpers ---------------------------------------------------------
function findNode(nodes: PageNode[], id: string): PageNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const f = findNode(n.children, id);
    if (f) return f;
  }
  return null;
}
function updateNode(nodes: PageNode[], id: string, patch: Partial<PageNode>): PageNode[] {
  return nodes.map((n) =>
    n.id === id ? { ...n, ...patch } : { ...n, children: updateNode(n.children, id, patch) },
  );
}
function removeNode(nodes: PageNode[], id: string): { tree: PageNode[]; removed: PageNode | null } {
  let removed: PageNode | null = null;
  const tree: PageNode[] = [];
  for (const n of nodes) {
    if (n.id === id) {
      removed = n;
      continue;
    }
    const r = removeNode(n.children, id);
    if (r.removed) removed = r.removed;
    tree.push({ ...n, children: r.tree });
  }
  return { tree, removed };
}
function insertNode(nodes: PageNode[], parentId: string | null, node: PageNode): PageNode[] {
  if (parentId === null) return [...nodes, node];
  return nodes.map((n) =>
    n.id === parentId
      ? { ...n, children: [...n.children, node] }
      : { ...n, children: insertNode(n.children, parentId, node) },
  );
}
function insertSibling(nodes: PageNode[], targetId: string, node: PageNode, position: "before" | "after"): PageNode[] {
  const out: PageNode[] = [];
  let placed = false;
  for (const n of nodes) {
    if (n.id === targetId) {
      placed = true;
      if (position === "before") out.push(node, n);
      else out.push(n, node);
    } else {
      out.push({ ...n, children: insertSibling(n.children, targetId, node, position) });
    }
  }
  return placed ? out : nodes;
}
function moveNode(pages: PageNode[], id: string, targetId: string | null, position: DropPosition): PageNode[] {
  const { tree, removed } = removeNode(pages, id);
  if (!removed) return pages;
  if (targetId === null) return [...tree, removed];
  if (position === "inside") return insertNode(tree, targetId, removed);
  return insertSibling(tree, targetId, removed, position);
}

function newDoc(): PageDoc {
  return { meta: {}, blocks: [{ type: "paragraph" }], comments: {} };
}

// In-memory workspace (native demo has no localStorage persistence).
function seed(): { pages: PageNode[]; docs: Record<string, PageDoc>; activeId: string } {
  const home = createId();
  const tasks = createId();
  const design = createId();
  const all = createId();
  return {
    activeId: all,
    pages: [
      { id: all, title: "All elements", icon: "🧱", children: [] },
      {
        id: home,
        title: "Getting Started",
        icon: "🚀",
        children: [{ id: tasks, title: "Tasks", icon: "📋", children: [] }],
      },
      { id: design, title: "Design", icon: "🎨", favorite: true, children: [] },
    ],
    docs: {
      [all]: { meta: { icon: "🧱", title: "All elements" }, blocks: allElementsContent, comments: {} },
      [home]: { meta: { icon: "🚀", title: "Getting Started" }, blocks: demoInitialContent, comments: {} },
      [tasks]: {
        meta: { icon: "📋", title: "Tasks" },
        blocks: [
          { type: "checkListItem", props: { checked: true }, content: "Build the editor core" },
          { type: "checkListItem", content: "Ship the page tree" },
          { type: "toggleListItem", props: { collapsed: false }, content: "Backlog", children: [{ type: "bulletListItem", content: "Tables" }] },
        ],
        comments: {},
      },
      [design]: {
        meta: { icon: "🎨", title: "Design" },
        blocks: [{ type: "heading", props: { level: 2 }, content: "Moodboard" }, { type: "paragraph", content: "Use /image, /video, /map…" }],
        comments: {},
      },
    },
  };
}

export default function App() {
  const initial = useRef(seed());
  const [dark, setDark] = useState(false);
  const [accent, setAccent] = useState(ACCENTS[0]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [pages, setPages] = useState<PageNode[]>(initial.current.pages);
  const [activeId, setActiveId] = useState<string>(initial.current.activeId);
  const [font, setFont] = useState<FontChoice>("default");
  const docs = useRef<Record<string, PageDoc>>(initial.current.docs);

  const nextFont: Record<FontChoice, FontChoice> = { default: "serif", serif: "mono", mono: "default" };
  const fontLabel: Record<FontChoice, string> = { default: "Sans", serif: "Serif", mono: "Mono" };

  const theme = withAccent(dark ? darkTheme : lightTheme, accent);

  const editor = useCreateEditor({
    initialContent: docs.current[activeId]?.blocks ?? [{ type: "paragraph" }],
    initialMeta: docs.current[activeId]?.meta,
    initialComments: docs.current[activeId]?.comments,
    blockSpecs: demoSchema.blockSpecs,
    inlineSpecs: demoSchema.inlineSpecs,
  });
  const version = useEditorState(editor);

  // Keep the tree title/icon in sync with the active page's metadata.
  useEffect(() => {
    docs.current[activeId] = { meta: editor.meta, blocks: editor.document, comments: editor.comments };
    const title = inlineToString(editor.meta.title) || "Untitled";
    setPages((p) => updateNode(p, activeId, { title, icon: editor.meta.icon }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  const switchTo = (id: string) => {
    if (!docs.current[id]) return;
    setDrawerOpen(false);
    if (id === activeId) return;
    docs.current[activeId] = { meta: editor.meta, blocks: editor.document, comments: editor.comments };
    setActiveId(id);
    const doc = docs.current[id];
    editor.replaceDocument(doc.blocks, doc.meta, doc.comments);
  };

  const addPage = (parentId: string | null) => {
    const id = createId();
    docs.current[id] = newDoc();
    setPages((p) => insertNode(p, parentId, { id, title: "Untitled", icon: undefined, children: [] }));
    switchTo(id);
  };

  const HeaderIcon = ({ name, active, onPress }: { name: Parameters<typeof Icon>[0]["name"]; active?: boolean; onPress: () => void }) => (
    <Pressable
      onPress={onPress}
      style={{
        padding: 7,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: active ? accent : theme.colors.border,
        backgroundColor: active ? theme.colors.accentSoft : "transparent",
      }}
    >
      <Icon name={name} size={15} color={active ? accent : theme.colors.text} />
    </Pressable>
  );

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <StatusBar style={dark ? "light" : "dark"} />

        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          }}
        >
          <HeaderIcon name="menu" onPress={() => setDrawerOpen(true)} />
          <Text style={{ fontSize: 15, fontWeight: "700", color: theme.colors.text }} numberOfLines={1}>
            BlockNote
          </Text>
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={() => setFont((f) => nextFont[f])}
            style={{ paddingHorizontal: 10, paddingVertical: 7, borderRadius: 6, borderWidth: 1, borderColor: theme.colors.border }}
          >
            <Text style={{ color: theme.colors.text, fontSize: 12, fontWeight: "600" }}>{fontLabel[font]}</Text>
          </Pressable>
          <HeaderIcon name={editor.locked ? "lock" : "unlock"} active={editor.locked} onPress={() => editor.setLocked(!editor.locked)} />
          <HeaderIcon name="undo" onPress={() => editor.undo()} />
          <HeaderIcon name="redo" onPress={() => editor.redo()} />
          <HeaderIcon name="comment" active={showComments} onPress={() => setShowComments((s) => !s)} />
          <HeaderIcon name={dark ? "sun" : "moon"} onPress={() => setDark((d) => !d)} />
        </View>

        {/* Editor + comments */}
        <View style={{ flex: 1, flexDirection: "row" }}>
          <BlockNoteView
            editor={editor}
            theme={theme}
            accentColor={accent}
            font={font}
            enableComments={false}
            blockRenderers={demoSchema.blockRenderers}
            inlineRenderers={demoSchema.inlineRenderers}
            slashItems={demoSchema.slashItems}
            onOpenPage={(id) => switchTo(id)}
            style={{ flex: 1 }}
          />
          {showComments ? (
            <CommentsPanel editor={editor} theme={theme} blockId={PAGE_COMMENTS} author="You" onClose={() => setShowComments(false)} />
          ) : null}
        </View>

        {/* Slide-in drawer with the page tree */}
        {drawerOpen ? (
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, flexDirection: "row" }}>
            <View style={{ width: 300, backgroundColor: theme.colors.backgroundSecondary, borderRightWidth: 1, borderRightColor: theme.colors.border }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.colors.border,
                }}
              >
                <Text style={{ flex: 1, fontSize: 13, fontWeight: "700", color: theme.colors.textSecondary, textTransform: "uppercase" }}>
                  Workspace
                </Text>
                <View style={{ flexDirection: "row", gap: 4 }}>
                  {ACCENTS.map((c) => (
                    <Pressable
                      key={c}
                      onPress={() => setAccent(c)}
                      style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: c, borderWidth: accent === c ? 2 : 0, borderColor: theme.colors.text }}
                    />
                  ))}
                </View>
                <Pressable onPress={() => setDrawerOpen(false)} style={{ padding: 4 }}>
                  <Icon name="close" size={16} color={theme.colors.textSecondary} />
                </Pressable>
              </View>
              {/* Row wrapper gives the PageTree (whose ScrollView is flex:1) a bounded height. */}
              <View style={{ flex: 1, flexDirection: "row" }}>
                <PageTree
                  pages={pages}
                  activeId={activeId}
                  theme={theme}
                  width={300}
                  onSelect={switchTo}
                  onAddChild={addPage}
                  onRename={(id, title) => {
                    setPages((p) => updateNode(p, id, { title }));
                    if (id === activeId) editor.setPageTitle(title);
                    else if (docs.current[id]) docs.current[id].meta = { ...docs.current[id].meta, title };
                  }}
                  onRemove={(id) => {
                    setPages((p) => removeNode(p, id).tree);
                    delete docs.current[id];
                    if (id === activeId) {
                      const first = pages.find((n) => n.id !== id);
                      if (first) switchTo(first.id);
                    }
                  }}
                  onToggleFavorite={(id) => setPages((p) => updateNode(p, id, { favorite: !findNode(p, id)?.favorite }))}
                  onMove={(id: string, targetId: string | null, position: DropPosition) => setPages((p) => moveNode(p, id, targetId, position))}
                />
              </View>
            </View>
            <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)" }} onPress={() => setDrawerOpen(false)} />
          </View>
        ) : null}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
