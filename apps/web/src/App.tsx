import { useEffect, useRef, useState } from "react";
import {
  BlockNoteView,
  Icon,
  PageTree,
  Pressable,
  ScrollView,
  Text,
  View,
  blocksToJSON,
  blocksToMarkdown,
  createId,
  darkTheme,
  inlineToString,
  lightTheme,
  useCreateEditor,
  useEditorState,
  withAccent,
  type DropPosition,
  type FontChoice,
  type PageNode,
  type PartialBlock,
} from "@sebastienaglae/bnn-react";
import { allElementsContent, demoInitialContent, demoPeople, demoSchema } from "@sebastienaglae/bnn-demo-shared";

interface PageDoc {
  meta: { icon?: string; cover?: string; title?: PartialBlock["content"] };
  blocks: PartialBlock[];
}

const ACCENTS = ["#2383e2", "#e03e3e", "#d9730d", "#0f9d58", "#9065b0", "#c14c8a"];
const STORAGE_KEY = "bnn-workspace-v3";

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
  return { meta: {}, blocks: [{ type: "paragraph" }] };
}

function seed(): { pages: PageNode[]; docs: Record<string, PageDoc>; activeId: string } {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    /* ignore */
  }
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
      [all]: { meta: { icon: "🧱", title: "All elements" }, blocks: allElementsContent },
      [home]: { meta: { icon: "🚀", title: "Getting Started" }, blocks: demoInitialContent },
      [tasks]: {
        meta: { icon: "📋", title: "Tasks" },
        blocks: [
          { type: "checkListItem", props: { checked: true }, content: "Build the editor core" },
          { type: "checkListItem", content: "Ship the page tree" },
          { type: "toggleListItem", props: { collapsed: false }, content: "Backlog", children: [{ type: "bulletListItem", content: "Tables" }] },
        ],
      },
      [design]: {
        meta: { icon: "🎨", title: "Design" },
        blocks: [{ type: "heading", props: { level: 2 }, content: "Moodboard" }, { type: "paragraph", content: "Use /image, /video, /map…" }],
      },
    },
  };
}

export function App(): JSX.Element {
  const initial = useRef(seed());
  const [dark, setDark] = useState(false);
  const [accent, setAccent] = useState(ACCENTS[0]);
  const [font, setFont] = useState<FontChoice>("default");
  const [preview, setPreview] = useState<"none" | "json" | "markdown">("none");
  const [pages, setPages] = useState<PageNode[]>(initial.current.pages);
  const [activeId, setActiveId] = useState<string>(initial.current.activeId);
  const docs = useRef<Record<string, PageDoc>>(initial.current.docs);

  const theme = withAccent(dark ? darkTheme : lightTheme, accent);

  const editor = useCreateEditor({
    initialContent: docs.current[activeId]?.blocks ?? [{ type: "paragraph" }],
    initialMeta: docs.current[activeId]?.meta,
    blockSpecs: demoSchema.blockSpecs,
    inlineSpecs: demoSchema.inlineSpecs,
  });
  const version = useEditorState(editor);

  useEffect(() => {
    (window as unknown as { __bnnEditor: typeof editor }).__bnnEditor = editor;
  }, [editor]);

  // Persist + keep the tree title/icon in sync with the page's metadata.
  useEffect(() => {
    docs.current[activeId] = {
      meta: editor.meta,
      blocks: editor.document,
    };
    const title = inlineToString(editor.meta.title) || "Untitled";
    setPages((p) => updateNode(p, activeId, { title, icon: editor.meta.icon }));
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ pages, docs: docs.current, activeId }));
      } catch {
        /* ignore */
      }
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  const switchTo = (id: string) => {
    if (id === activeId || !docs.current[id]) return;
    docs.current[activeId] = { meta: editor.meta, blocks: editor.document };
    setActiveId(id);
    const doc = docs.current[id];
    editor.replaceDocument(doc.blocks, doc.meta);
  };

  const addPage = (parentId: string | null) => {
    const id = createId();
    docs.current[id] = newDoc();
    // No default emoji — the tree shows a document icon until the user picks one (#12).
    setPages((p) => insertNode(p, parentId, { id, title: "Untitled", icon: undefined, children: [] }));
    switchTo(id);
  };

  const HeaderBtn = ({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) => (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: active ? accent : theme.colors.border,
        backgroundColor: active ? theme.colors.accentSoft : "transparent",
      }}
    >
      <Text style={{ color: active ? accent : theme.colors.text, fontSize: 13, fontWeight: "500" }}>{label}</Text>
    </Pressable>
  );

  const previewText =
    preview === "json"
      ? blocksToJSON(editor.document)
      : preview === "markdown"
        ? blocksToMarkdown(editor.document, demoSchema.markdownSerializers)
        : "";
  const nextFont: Record<FontChoice, FontChoice> = { default: "serif", serif: "mono", mono: "default" };

  return (
    <View style={{ height: "100%", backgroundColor: theme.colors.background, flexDirection: "row" }}>
      <PageTree
        pages={pages}
        activeId={activeId}
        theme={theme}
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

      <View style={{ flex: 1, height: "100%" }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: "700", color: theme.colors.text }}>BlockNote Native</Text>
          <View style={{ flexDirection: "row", gap: 4, marginLeft: 6, alignItems: "center" }}>
            {ACCENTS.map((c) => (
              <Pressable
                key={c}
                onPress={() => setAccent(c)}
                style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: c, borderWidth: accent === c ? 2 : 0, borderColor: theme.colors.text }}
              />
            ))}
            {/* Configurable custom accent (#2 / "add more accent") */}
            <input
              type="color"
              value={accent}
              onChange={(e) => setAccent(e.target.value)}
              title="Custom accent"
              style={{ width: 22, height: 22, padding: 0, border: "none", background: "none", cursor: "pointer" }}
            />
          </View>
          <View style={{ flex: 1 }} />
          <HeaderBtn label={`Aa ${font}`} onPress={() => setFont(nextFont[font])} />
          <Pressable onPress={() => editor.setLocked(!editor.locked)} style={{ padding: 7, borderRadius: 6, borderWidth: 1, borderColor: editor.locked ? accent : theme.colors.border, backgroundColor: editor.locked ? theme.colors.accentSoft : "transparent" }}>
            <Icon name={editor.locked ? "lock" : "unlock"} size={15} color={editor.locked ? accent : theme.colors.text} />
          </Pressable>
          <Pressable onPress={() => editor.undo()} style={{ padding: 7, borderRadius: 6, borderWidth: 1, borderColor: theme.colors.border }}>
            <Icon name="undo" size={15} color={theme.colors.text} />
          </Pressable>
          <Pressable onPress={() => editor.redo()} style={{ padding: 7, borderRadius: 6, borderWidth: 1, borderColor: theme.colors.border }}>
            <Icon name="redo" size={15} color={theme.colors.text} />
          </Pressable>
          <HeaderBtn label="JSON" active={preview === "json"} onPress={() => setPreview(preview === "json" ? "none" : "json")} />
          <HeaderBtn label="MD" active={preview === "markdown"} onPress={() => setPreview(preview === "markdown" ? "none" : "markdown")} />
          <Pressable onPress={() => setDark((d) => !d)} style={{ padding: 7, borderRadius: 6, borderWidth: 1, borderColor: theme.colors.border }}>
            <Icon name={dark ? "sun" : "moon"} size={15} color={theme.colors.text} />
          </Pressable>
        </View>

        <View style={{ flex: 1, flexDirection: "row" }}>
          <BlockNoteView
            editor={editor}
            theme={theme}
            accentColor={accent}
            font={font}
            people={demoPeople}
            blockRenderers={demoSchema.blockRenderers}
            inlineRenderers={demoSchema.inlineRenderers}
            slashItems={demoSchema.slashItems}
            onOpenPage={(id) => switchTo(id)}
            style={{ flex: 1 }}
          />
          {preview !== "none" ? (
            <View style={{ width: 360, borderLeftWidth: 1, borderLeftColor: theme.colors.border, backgroundColor: theme.colors.backgroundSecondary }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: theme.colors.textSecondary, padding: 12, textTransform: "uppercase" }}>
                {preview} output
              </Text>
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14 }}>
                <Text style={{ fontFamily: theme.monoFamily, fontSize: 12, lineHeight: 18, color: theme.colors.text }}>{previewText}</Text>
              </ScrollView>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}
