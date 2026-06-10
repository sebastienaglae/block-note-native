import { createContext, useContext, type ComponentType, type ReactNode } from "react";
import type { IconName } from "./iconNames";

export interface IconComponentProps {
  size?: number;
  color?: string;
}

/** Host-provided overrides: swap any named icon for your own component. */
export type IconOverrides = Partial<Record<IconName, ComponentType<IconComponentProps>>>;

export const IconsContext = createContext<IconOverrides | null>(null);

export function IconsProvider({ icons, children }: { icons?: IconOverrides; children: ReactNode }): JSX.Element {
  // Passthrough when no overrides, so nested providers inherit a parent's icons.
  if (!icons) return <>{children}</>;
  return <IconsContext.Provider value={icons}>{children}</IconsContext.Provider>;
}

export function useIconOverride(name: IconName): ComponentType<IconComponentProps> | undefined {
  const ctx = useContext(IconsContext);
  return ctx?.[name];
}
