import { createContext, useContext, type ReactNode } from "react";

export interface CommentsApi {
  openComments: (blockId: string) => void;
  activeBlockId: string | null;
}

const CommentsContext = createContext<CommentsApi | null>(null);

export function CommentsProvider({ value, children }: { value: CommentsApi; children: ReactNode }): JSX.Element {
  return <CommentsContext.Provider value={value}>{children}</CommentsContext.Provider>;
}

/** Returns the comments API, or null when comments aren't enabled. */
export function useCommentsOptional(): CommentsApi | null {
  return useContext(CommentsContext);
}
