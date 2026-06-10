/**
 * Drag-and-drop reordering for top-level blocks. One implementation drives both
 * web (via react-native-web pointer events) and native, using PanResponder +
 * measured layouts. Nesting is done with Tab / Shift-Tab.
 */
import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { PanResponder, Platform, type PanResponderInstance } from "react-native";
import type { Editor } from "@sebastienaglae/bnn-core";
import type { BlockLayout } from "../context";

/** Suppress text selection + show a grabbing cursor while dragging (web only). */
function setDragging(on: boolean) {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  document.body.style.userSelect = on ? "none" : "";
  (document.body.style as unknown as { webkitUserSelect: string }).webkitUserSelect = on ? "none" : "";
  document.body.style.cursor = on ? "grabbing" : "";
}

export interface DragState {
  draggingId: string | null;
  targetId: string | null;
  placement: "before" | "after";
}

interface DndApi {
  state: DragState;
  /** PanResponder handlers for a block's drag handle. */
  handleProps: (blockId: string) => PanResponderInstance["panHandlers"];
  setContainerOffset: (pageY: number) => void;
  setScrollOffset: (y: number) => void;
  /** Offset of the blocks container within the scroll content (e.g. below the page header). */
  setBlocksOffset: (y: number) => void;
}

const DndContext = createContext<DndApi | null>(null);

export function useDnd(): DndApi {
  const ctx = useContext(DndContext);
  if (!ctx) throw new Error("useDnd must be used within DndProvider");
  return ctx;
}

export interface DndProviderProps {
  editor: Editor;
  /** Ordered list of top-level block ids (drop targets). */
  topLevelIds: string[];
  layouts: React.MutableRefObject<Map<string, BlockLayout>>;
  children: ReactNode;
}

export function DndProvider({ editor, topLevelIds, layouts, children }: DndProviderProps): JSX.Element {
  const [state, setState] = useState<DragState>({ draggingId: null, targetId: null, placement: "after" });
  const stateRef = useRef(state);
  stateRef.current = state;
  const containerPageY = useRef(0);
  const scrollOffset = useRef(0);
  const blocksOffset = useRef(0);
  const idsRef = useRef(topLevelIds);
  idsRef.current = topLevelIds;
  const respondersRef = useRef<Map<string, PanResponderInstance>>(new Map());

  const resolveTarget = (screenY: number): { targetId: string | null; placement: "before" | "after" } => {
    // Block layouts are relative to the blocks container; add its offset within the
    // scroll content (the page header sits above it) so the hit-test lines up.
    const contentY = screenY - containerPageY.current + scrollOffset.current - blocksOffset.current;
    let result: { targetId: string | null; placement: "before" | "after" } = { targetId: null, placement: "after" };
    for (const id of idsRef.current) {
      const l = layouts.current.get(id);
      if (!l) continue;
      if (contentY >= l.y && contentY <= l.y + l.height) {
        result = { targetId: id, placement: contentY < l.y + l.height / 2 ? "before" : "after" };
        return result;
      }
    }
    // Past the end -> after the last block.
    const lastId = idsRef.current[idsRef.current.length - 1];
    const last = lastId ? layouts.current.get(lastId) : undefined;
    if (last && contentY > last.y + last.height) return { targetId: lastId, placement: "after" };
    return result;
  };

  const api = useMemo<DndApi>(() => {
    const make = (blockId: string): PanResponderInstance => {
      return PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          setDragging(true);
          setState({ draggingId: blockId, targetId: blockId, placement: "after" });
        },
        onPanResponderMove: (_evt: unknown, gesture: { moveY: number }) => {
          const { targetId, placement } = resolveTarget(gesture.moveY);
          const cur = stateRef.current;
          if (cur.targetId !== targetId || cur.placement !== placement) {
            setState({ draggingId: blockId, targetId, placement });
          }
        },
        onPanResponderRelease: () => {
          setDragging(false);
          const { draggingId, targetId, placement } = stateRef.current;
          if (draggingId && targetId && targetId !== draggingId) {
            editor.moveBlock(draggingId, targetId, placement);
          }
          setState({ draggingId: null, targetId: null, placement: "after" });
        },
        onPanResponderTerminate: () => {
          setDragging(false);
          setState({ draggingId: null, targetId: null, placement: "after" });
        },
      });
    };
    return {
      state,
      handleProps: (blockId: string) => {
        let r = respondersRef.current.get(blockId);
        if (!r) {
          r = make(blockId);
          respondersRef.current.set(blockId, r);
        }
        return r.panHandlers;
      },
      setContainerOffset: (pageY: number) => {
        containerPageY.current = pageY;
      },
      setScrollOffset: (y: number) => {
        scrollOffset.current = y;
      },
      setBlocksOffset: (y: number) => {
        blocksOffset.current = y;
      },
    };
    // `state` intentionally included so consumers re-render with the latest indicator.
  }, [editor, state]);

  return <DndContext.Provider value={api}>{children}</DndContext.Provider>;
}
