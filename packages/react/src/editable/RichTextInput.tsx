/**
 * Web editable surface. A `contentEditable` <div> whose DOM is painted
 * imperatively (rock-solid caret behaviour, no React reconciliation of the
 * editable subtree). Custom inline content is mounted as React islands.
 *
 * Used on web (Vite) AND under react-native-web (Expo web). Real iOS/Android
 * use `RichTextInput.native.tsx` instead.
 */
import { useEffect, useLayoutEffect, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  inlineLength,
  inlineToString,
  type CustomInlineContent,
  type InlineContent,
} from "@bnn/core";
import type { RichTextInputProps } from "../types";
import {
  domPointToOffset,
  getSelectionOffsets,
  paintHtml,
  readModel,
  setSelectionOffsets,
} from "./dom";

function contentEquals(a: InlineContent[], b: InlineContent[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function RichTextInput(props: RichTextInputProps): JSX.Element {
  const {
    content,
    active,
    selection,
    placeholder,
    editable = true,
    textStyle,
    theme,
    renderCustomInline,
    onChange,
    onSelectionChange,
    onFocus,
    onBlur,
    onEnter,
    onBackspaceAtStart,
    onTab,
    onArrowOut,
  } = props;

  const ref = useRef<HTMLDivElement | null>(null);
  const paintedRef = useRef<InlineContent[] | null>(null);
  const rootsRef = useRef<Map<number, Root>>(new Map());
  const composingRef = useRef(false);
  const focusedRef = useRef(false);
  const lastReportedSel = useRef<{ start: number; end: number } | null>(null);

  const unmountIslands = () => {
    const roots = rootsRef.current;
    if (roots.size === 0) return;
    const toUnmount = Array.from(roots.values());
    rootsRef.current = new Map();
    // Defer to avoid "unmount during render" warnings.
    setTimeout(() => toUnmount.forEach((r) => r.unmount()), 0);
  };

  const paint = (el: HTMLDivElement) => {
    unmountIslands();
    const { html, customs } = paintHtml(content, theme);
    el.innerHTML = html;
    if (renderCustomInline) {
      for (const { idx, ic } of customs) {
        const host = el.querySelector<HTMLElement>(`[data-idx="${idx}"]`);
        if (!host) continue;
        host.textContent = "";
        const root = createRoot(host);
        root.render(renderCustomInline(ic as CustomInlineContent));
        rootsRef.current.set(idx, root);
      }
    }
    paintedRef.current = content;
  };

  // Paint + selection sync on every render (cheap when nothing changed).
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const needsPaint =
      !composingRef.current &&
      (paintedRef.current === null || !contentEquals(content, paintedRef.current));
    if (needsPaint) paint(el);

    if (active && editable) {
      if (el.ownerDocument.activeElement !== el) el.focus({ preventScroll: true });
      if (selection) {
        const reportedHere =
          lastReportedSel.current &&
          lastReportedSel.current.start === selection.start &&
          lastReportedSel.current.end === selection.end;
        if (needsPaint || !reportedHere) {
          setSelectionOffsets(el, selection.start, selection.end);
          lastReportedSel.current = { start: selection.start, end: selection.end };
        }
      }
    }
  });

  useEffect(() => () => unmountIslands(), []); // cleanup on unmount

  // Report selection changes while focused.
  useEffect(() => {
    const doc = ref.current?.ownerDocument;
    if (!doc) return;
    const handler = () => {
      const el = ref.current;
      if (!el || !focusedRef.current || composingRef.current) return;
      const sel = getSelectionOffsets(el);
      if (!sel) return;
      if (
        lastReportedSel.current &&
        lastReportedSel.current.start === sel.start &&
        lastReportedSel.current.end === sel.end
      )
        return;
      lastReportedSel.current = sel;
      onSelectionChange(sel);
    };
    doc.addEventListener("selectionchange", handler);
    return () => doc.removeEventListener("selectionchange", handler);
  }, [onSelectionChange]);

  const emitChange = () => {
    const el = ref.current;
    if (!el) return;
    const model = readModel(el);
    const sel = getSelectionOffsets(el) ?? { start: inlineLength(model), end: inlineLength(model) };
    paintedRef.current = model; // DOM already reflects this -> skip repaint
    lastReportedSel.current = sel;
    onChange(model, sel);
  };

  const handleInput = () => {
    if (composingRef.current) return;
    emitChange();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (composingRef.current) return;
    const el = ref.current;
    if (!el) return;

    // Formatting shortcuts
    if (e.metaKey || e.ctrlKey) {
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) return; // let editor handle undo at the view level
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const sel = getSelectionOffsets(el);
      onEnter?.(sel ? sel.start : inlineLength(content));
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      onTab?.(e.shiftKey);
      return;
    }
    if (e.key === "Backspace") {
      const sel = getSelectionOffsets(el);
      if (sel && sel.start === 0 && sel.end === 0) {
        e.preventDefault();
        onBackspaceAtStart?.();
      }
      return;
    }
    if (e.key === "ArrowUp") {
      const sel = getSelectionOffsets(el);
      if (sel && sel.start === 0 && sel.end === 0) {
        e.preventDefault();
        onArrowOut?.("up", 0);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      const sel = getSelectionOffsets(el);
      const len = inlineLength(content);
      if (sel && sel.start === len && sel.end === len) {
        e.preventDefault();
        onArrowOut?.("down", len);
      }
      return;
    }
  };

  const empty = inlineToString(content).length === 0;

  const wrapperStyle: React.CSSProperties = { position: "relative" };
  const editableStyle: React.CSSProperties = {
    outline: "none",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    color: textStyle?.color ?? theme.colors.text,
    fontSize: textStyle?.fontSize ?? 16,
    fontWeight: textStyle?.fontWeight ?? "400",
    lineHeight: textStyle?.lineHeight ? `${textStyle.lineHeight}px` : "1.5",
    fontStyle: textStyle?.fontStyle ?? "normal",
    fontFamily: textStyle?.fontFamily ?? theme.fontFamily,
    minHeight: "1.5em",
    caretColor: theme.colors.text,
  };
  const placeholderStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    pointerEvents: "none",
    color: theme.colors.placeholder,
    fontSize: textStyle?.fontSize ?? 16,
    fontWeight: textStyle?.fontWeight ?? "400",
    lineHeight: textStyle?.lineHeight ? `${textStyle.lineHeight}px` : "1.5",
    fontFamily: textStyle?.fontFamily ?? theme.fontFamily,
  };

  return (
    <div style={wrapperStyle}>
      {empty && placeholder ? <div style={placeholderStyle}>{placeholder}</div> : null}
      <div
        ref={ref}
        contentEditable={editable}
        suppressContentEditableWarning
        spellCheck
        role="textbox"
        aria-multiline="true"
        style={editableStyle}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onCompositionStart={() => {
          composingRef.current = true;
        }}
        onCompositionEnd={() => {
          composingRef.current = false;
          emitChange();
        }}
        onFocus={() => {
          focusedRef.current = true;
          onFocus?.();
        }}
        onBlur={() => {
          focusedRef.current = false;
          onBlur?.();
        }}
      />
    </div>
  );
}
