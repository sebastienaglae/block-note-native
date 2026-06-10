import { useRef, useSyncExternalStore } from "react";
import { Editor, type EditorOptions } from "@sebastienaglae/bnn-core";

/** Creates a single stable {@link Editor} instance for the component's lifetime. */
export function useCreateEditor(options: EditorOptions = {}): Editor {
  const ref = useRef<Editor | null>(null);
  if (ref.current === null) ref.current = new Editor(options);
  return ref.current;
}

/** Re-renders the component whenever the editor's document/selection changes. */
export function useEditorState(editor: Editor): number {
  return useSyncExternalStore(editor.subscribe, editor.getSnapshot, editor.getSnapshot);
}
