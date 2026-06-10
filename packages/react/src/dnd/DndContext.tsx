/**
 * Drag-and-drop reordering for top-level blocks. One implementation drives both
 * web (via react-native-web pointer events) and native, using PanResponder +
 * measured layouts. Nesting is done with Tab / Shift-Tab.
 */
import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { PanResponder, type PanResponderInstance } from "react-native";
import type { Editor } from "@bnn/core";
import type { BlockLayout } from "../context";

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
  const idsRef = useRef(topLevelIds);
  idsRef.current = topLevelIds;
  const respondersRef = useRef<Map<string, PanResponderInstance>>(new Map());

  const resolveTarget = (screenY: number): { targetId: string | null; placement: "before" | "after" } => {
    const contentY = screenY - containerPageY.current + scrollOffset.current;
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
          const { draggingId, targetId, placement } = stateRef.current;
          if (draggingId && targetId && targetId !== draggingId) {
            editor.moveBlock(draggingId, targetId, placement);
          }
          setState({ draggingId: null, targetId: null, placement: "after" });
        },
        onPanResponderTerminate: () => setState({ draggingId: null, targetId: null, placement: "after" }),
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
    };
    // `state` intentionally included so consumers re-render with the latest indicator.
  }, [editor, state]);

  return <DndContext.Provider value={api}>{children}</DndContext.Provider>;
}
