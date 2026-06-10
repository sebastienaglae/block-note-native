import { useRef, useState } from "react";
import { PanResponder, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import type { Theme } from "../theme/theme";
import { Icon } from "../icons/Icon";
import type { IconName } from "../icons/iconNames";
import { I18nProvider, useT, type TFunction } from "../i18n/I18nContext";
import { IconsProvider, type IconOverrides } from "../icons/IconContext";

export interface PageNode {
  id: string;
  title: string;
  icon?: string;
  favorite?: boolean;
  children: PageNode[];
}

export type DropPosition = "before" | "after" | "inside";

export interface PageTreeProps {
  pages: PageNode[];
  activeId?: string;
  theme: Theme;
  width?: number;
  t?: TFunction;
  icons?: IconOverrides;
  onSelect: (id: string) => void;
  onAddChild: (parentId: string | null) => void;
  onRename: (id: string, title: string) => void;
  onRemove: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  /** Drag-drop or menu move. targetId null = top level. */
  onMove: (id: string, targetId: string | null, position: DropPosition) => void;
}

function flattenAll(nodes: PageNode[], depth = 0): Array<{ node: PageNode; depth: number }> {
  const out: Array<{ node: PageNode; depth: number }> = [];
  for (const node of nodes) {
    out.push({ node, depth });
    out.push(...flattenAll(node.children, depth + 1));
  }
  return out;
}
function flattenVisible(nodes: PageNode[], expanded: Set<string>, depth = 0): Array<{ node: PageNode; depth: number }> {
  const out: Array<{ node: PageNode; depth: number }> = [];
  for (const node of nodes) {
    out.push({ node, depth });
    if (expanded.has(node.id) && node.children.length) out.push(...flattenVisible(node.children, expanded, depth + 1));
  }
  return out;
}
function subtreeIds(node: PageNode): Set<string> {
  const set = new Set<string>([node.id]);
  for (const c of node.children) for (const id of subtreeIds(c)) set.add(id);
  return set;
}
function findNode(nodes: PageNode[], id: string): PageNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const f = findNode(n.children, id);
    if (f) return f;
  }
  return null;
}

function setBodyDragging(on: boolean) {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  document.body.style.userSelect = on ? "none" : "";
  document.body.style.cursor = on ? "grabbing" : "";
}

interface DragState {
  id: string | null;
  targetId: string | null;
  position: DropPosition;
}

function PageTreeInner(props: PageTreeProps): JSX.Element {
  const { pages, activeId, theme, onSelect, onAddChild, onRename, onRemove, onToggleFavorite, onMove } = props;
  const t = useT();
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(pages.map((p) => p.id)));
  const [hovered, setHovered] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [moveFor, setMoveFor] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [drag, setDrag] = useState<DragState>({ id: null, targetId: null, position: "after" });

  const dragRef = useRef(drag);
  dragRef.current = drag;
  const rowLayouts = useRef<Map<string, { y: number; height: number }>>(new Map());
  const containerTop = useRef(0);
  const scrollY = useRef(0);
  const scrollRef = useRef<{ measureInWindow?: (cb: (x: number, y: number) => void) => void } | null>(null);
  const responders = useRef<Map<string, ReturnType<typeof PanResponder.create>>>(new Map());

  const all = flattenAll(pages);
  const visible = flattenVisible(pages, expanded);
  const favorites = all.filter((f) => f.node.favorite).map((f) => f.node);

  const resolveDrop = (screenY: number): { targetId: string | null; position: DropPosition } => {
    const draggingNode = dragRef.current.id ? findNode(pages, dragRef.current.id) : null;
    const forbidden = draggingNode ? subtreeIds(draggingNode) : new Set<string>();
    const contentY = screenY - containerTop.current + scrollY.current;
    for (const [id, l] of rowLayouts.current) {
      if (forbidden.has(id)) continue;
      if (contentY >= l.y && contentY <= l.y + l.height) {
        const r = (contentY - l.y) / l.height;
        return { targetId: id, position: r < 0.33 ? "before" : r > 0.66 ? "after" : "inside" };
      }
    }
    return { targetId: null, position: "after" };
  };

  const handleProps = (id: string) => {
    let resp = responders.current.get(id);
    if (!resp) {
      resp = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          setBodyDragging(true);
          setDrag({ id, targetId: null, position: "after" });
        },
        onPanResponderMove: (_e: unknown, g: { moveY: number }) => {
          const { targetId, position } = resolveDrop(g.moveY);
          const c = dragRef.current;
          if (c.targetId !== targetId || c.position !== position) setDrag({ id, targetId, position });
        },
        onPanResponderRelease: () => {
          setBodyDragging(false);
          const c = dragRef.current;
          if (c.id && c.targetId && c.targetId !== c.id) onMove(c.id, c.targetId, c.position);
          setDrag({ id: null, targetId: null, position: "after" });
        },
        onPanResponderTerminate: () => {
          setBodyDragging(false);
          setDrag({ id: null, targetId: null, position: "after" });
        },
      });
      responders.current.set(id, resp);
    }
    return resp.panHandlers;
  };

  const toggleExpand = (id: string) =>
    setExpanded((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const startRename = (node: PageNode) => {
    setRenaming(node.id);
    setDraft(node.title);
    setMenuFor(null);
  };
  const commitRename = (id: string) => {
    onRename(id, draft.trim() || t("bnn.tree.untitled", "Untitled"));
    setRenaming(null);
  };

  const IconBtn = ({ name, onPress, label }: { name: IconName; onPress: () => void; label?: string }) => (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      style={({ hovered: h }: { hovered?: boolean }) => ({
        width: 22,
        height: 22,
        borderRadius: 4,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: h ? theme.colors.border : "transparent",
      })}
    >
      <Icon name={name} size={14} color={theme.colors.textSecondary} />
    </Pressable>
  );

  const MenuRow = ({ icon, label, onPress, danger }: { icon: IconName; label: string; onPress: () => void; danger?: boolean }) => (
    <Pressable
      onPress={onPress}
      style={({ hovered: h }: { hovered?: boolean }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 5,
        backgroundColor: h ? theme.colors.menuHover : "transparent",
      })}
    >
      <Icon name={icon} size={14} color={danger ? "#e03e3e" : theme.colors.textSecondary} />
      <Text style={{ color: danger ? "#e03e3e" : theme.colors.text, fontSize: 13 }}>{label}</Text>
    </Pressable>
  );

  const PageIcon = ({ node }: { node: PageNode }) =>
    node.icon ? (
      <Text style={{ fontSize: 14, width: 18, textAlign: "center" }}>{node.icon}</Text>
    ) : (
      <View style={{ width: 18, alignItems: "center" }}>
        <Icon name="page" size={15} color={theme.colors.textSecondary} />
      </View>
    );

  const dropLine = (
    <View style={{ height: 2, borderRadius: 1, backgroundColor: theme.colors.accent, marginVertical: 1 }} />
  );

  const renderRow = ({ node, depth }: { node: PageNode; depth: number }) => {
    const isActive = node.id === activeId;
    const isHover = hovered === node.id;
    const hasChildren = node.children.length > 0;
    const isOpen = expanded.has(node.id);
    const actionsShown = Platform.OS !== "web" || isHover || menuFor === node.id;
    const isDropInside = drag.id && drag.targetId === node.id && drag.position === "inside";
    const forbidden = subtreeIds(node);
    const webHover =
      Platform.OS === "web"
        ? { onMouseEnter: () => setHovered(node.id), onMouseLeave: () => setHovered((h) => (h === node.id ? null : h)) }
        : {};

    return (
      <View
        key={node.id}
        onLayout={(e) => rowLayouts.current.set(node.id, { y: e.nativeEvent.layout.y, height: e.nativeEvent.layout.height })}
      >
        {drag.id && drag.targetId === node.id && drag.position === "before" ? dropLine : null}
        {/* Hover container (not a Pressable, so action buttons don't trigger select) (#2) */}
        <View
          {...(webHover as object)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            height: 30,
            paddingRight: 6,
            paddingLeft: 6 + depth * 14,
            borderRadius: 5,
            opacity: drag.id === node.id ? 0.4 : 1,
            backgroundColor: isDropInside
              ? theme.colors.accentSoft
              : isActive
                ? theme.colors.accentSoft
                : isHover
                  ? theme.colors.menuHover
                  : "transparent",
          }}
        >
          <Pressable onPress={() => (hasChildren ? toggleExpand(node.id) : undefined)} style={{ width: 16, height: 16, alignItems: "center", justifyContent: "center" }}>
            {hasChildren ? <Icon name={isOpen ? "chevronDown" : "chevronRight"} size={12} color={theme.colors.textSecondary} /> : null}
          </Pressable>
          <Pressable onPress={() => onSelect(node.id)} style={{ flex: 1, flexDirection: "row", alignItems: "center", height: 30 }}>
            <View style={{ marginRight: 4 }}>
              <PageIcon node={node} />
            </View>
            {renaming === node.id ? (
              <TextInput
                value={draft}
                onChangeText={setDraft}
                onBlur={() => commitRename(node.id)}
                autoFocus
                style={{ flex: 1, color: theme.colors.text, fontSize: 14, padding: 0, borderBottomWidth: 1, borderColor: theme.colors.accent }}
              />
            ) : (
              <Text numberOfLines={1} style={{ flex: 1, fontSize: 14, color: isActive ? theme.colors.accent : theme.colors.text }}>
                {node.title || t("bnn.tree.untitled", "Untitled")}
              </Text>
            )}
          </Pressable>
          {/* Actions: reserved width, opacity by hover -> always reachable, no shift (#2) */}
          <View
            style={{ flexDirection: "row", width: 66, justifyContent: "flex-end", opacity: actionsShown ? 1 : 0 }}
            pointerEvents={actionsShown ? "auto" : "none"}
          >
            <View {...handleProps(node.id)} style={{ width: 22, height: 22, alignItems: "center", justifyContent: "center", cursor: "grab" }}>
              <Icon name="drag" size={13} color={theme.colors.textSecondary} />
            </View>
            <IconBtn name="more" label="Options" onPress={() => setMenuFor((m) => (m === node.id ? null : node.id))} />
            <IconBtn name="add" label={t("bnn.tree.addChild", "Add a page inside")} onPress={() => { onAddChild(node.id); setExpanded((s) => new Set(s).add(node.id)); }} />
          </View>
        </View>
        {drag.id && drag.targetId === node.id && drag.position === "after" ? dropLine : null}

        {menuFor === node.id ? (
          <View style={{ marginLeft: 6 + depth * 14 + 16, marginVertical: 2, backgroundColor: theme.colors.menuBackground, borderRadius: 6, borderWidth: 1, borderColor: theme.colors.border, paddingVertical: 4 }}>
            <MenuRow icon="star" label={node.favorite ? t("bnn.tree.removeFavorite", "Remove from favorites") : t("bnn.tree.addFavorite", "Add to favorites")} onPress={() => { onToggleFavorite(node.id); setMenuFor(null); }} />
            <MenuRow icon="rename" label={t("bnn.tree.rename", "Rename")} onPress={() => startRename(node)} />
            <MenuRow icon="move" label={t("bnn.tree.move", "Move to…")} onPress={() => setMoveFor((m) => (m === node.id ? null : node.id))} />
            <MenuRow icon="trash" label={t("bnn.tree.delete", "Delete")} danger onPress={() => { onRemove(node.id); setMenuFor(null); }} />
            {moveFor === node.id ? (
              <View style={{ borderTopWidth: 1, borderColor: theme.colors.border, marginTop: 4, paddingTop: 4 }}>
                <Text style={{ fontSize: 10, color: theme.colors.textSecondary, paddingHorizontal: 10, paddingBottom: 2, textTransform: "uppercase" }}>{t("bnn.tree.moveUnder", "Move under")}</Text>
                <ScrollView style={{ maxHeight: 160 }}>
                  <MenuRow icon="chevronRight" label={t("bnn.tree.moveTop", "Top level")} onPress={() => { onMove(node.id, null, "inside"); setMenuFor(null); setMoveFor(null); }} />
                  {all.filter((f) => !forbidden.has(f.node.id)).map((f) => (
                    <MenuRow key={f.node.id} icon="page" label={f.node.title || t("bnn.tree.untitled", "Untitled")} onPress={() => { onMove(node.id, f.node.id, "inside"); setMenuFor(null); setMoveFor(null); }} />
                  ))}
                </ScrollView>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={{ width: props.width ?? 260, backgroundColor: theme.colors.backgroundSecondary, borderRightWidth: 1, borderRightColor: theme.colors.border }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10 }}>
        <Text style={{ flex: 1, fontSize: 12, fontWeight: "700", color: theme.colors.textSecondary, textTransform: "uppercase" }}>{t("bnn.tree.pages", "Pages")}</Text>
        <Pressable onPress={() => onAddChild(null)} style={({ hovered: h }: { hovered?: boolean }) => ({ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5, backgroundColor: h ? theme.colors.menuHover : "transparent" })}>
          <Icon name="add" size={14} color={theme.colors.textSecondary} />
          <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>{t("bnn.tree.new", "New page")}</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef as never}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 6, paddingBottom: 20 }}
        scrollEventThrottle={16}
        onScroll={(e) => { scrollY.current = e.nativeEvent.contentOffset.y; }}
        onLayout={() => scrollRef.current?.measureInWindow?.((_x, y) => { containerTop.current = y; })}
      >
        {favorites.length ? (
          <View style={{ marginBottom: 8 }}>
            <Text style={{ fontSize: 10, fontWeight: "700", color: theme.colors.textSecondary, paddingHorizontal: 8, paddingVertical: 4, textTransform: "uppercase" }}>{t("bnn.tree.favorites", "Favorites")}</Text>
            {favorites.map((node) => (
              <View key={`fav-${node.id}`} style={{ flexDirection: "row", alignItems: "center", height: 28, paddingHorizontal: 8, borderRadius: 5 }}>
                <Pressable onPress={() => onSelect(node.id)} style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                  <View style={{ marginRight: 6 }}><PageIcon node={node} /></View>
                  <Text numberOfLines={1} style={{ flex: 1, fontSize: 14, color: theme.colors.text }}>{node.title || t("bnn.tree.untitled", "Untitled")}</Text>
                </Pressable>
                <IconBtn name="star" label={t("bnn.tree.removeFavorite", "Remove from favorites")} onPress={() => onToggleFavorite(node.id)} />
              </View>
            ))}
          </View>
        ) : null}
        {visible.map((row) => renderRow(row))}
      </ScrollView>
    </View>
  );
}

/** Standalone, self-contained page tree (own i18n + icon providers). */
export function PageTree(props: PageTreeProps): JSX.Element {
  return (
    <I18nProvider t={props.t}>
      <IconsProvider icons={props.icons}>
        <PageTreeInner {...props} />
      </IconsProvider>
    </I18nProvider>
  );
}
