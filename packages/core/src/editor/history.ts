/** Snapshot-based undo/redo. Document arrays are immutable, so snapshots are cheap references. */
import type { Block, EditorSelection } from "../model/types";

export interface Snapshot {
  document: Block[];
  selection: EditorSelection;
}

export class History {
  private undoStack: Snapshot[] = [];
  private redoStack: Snapshot[] = [];
  private readonly limit: number;

  constructor(limit = 200) {
    this.limit = limit;
  }

  /** Record the state *before* a mutation. Clears the redo stack. */
  record(snapshot: Snapshot): void {
    this.undoStack.push(snapshot);
    if (this.undoStack.length > this.limit) this.undoStack.shift();
    this.redoStack = [];
  }

  undo(current: Snapshot): Snapshot | null {
    const prev = this.undoStack.pop();
    if (!prev) return null;
    this.redoStack.push(current);
    return prev;
  }

  redo(current: Snapshot): Snapshot | null {
    const next = this.redoStack.pop();
    if (!next) return null;
    this.undoStack.push(current);
    return next;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}
