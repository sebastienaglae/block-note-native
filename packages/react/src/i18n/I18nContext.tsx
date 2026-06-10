/**
 * i18n: every user-facing string goes through `t(key, fallback)`. Host apps pass
 * their own translate function (e.g. an i18next adapter); when none is provided
 * the English `fallback` is used. See `enLabels` for the full key catalog.
 */
import { createContext, useContext, type ReactNode } from "react";

export type TFunction = (key: string, fallback: string) => string;

const defaultT: TFunction = (_key, fallback) => fallback;

const I18nContext = createContext<TFunction>(defaultT);

export function I18nProvider({ t, children }: { t?: TFunction; children: ReactNode }): JSX.Element {
  // Passthrough when no t is given, so nested providers inherit a parent's t.
  if (!t) return <>{children}</>;
  return <I18nContext.Provider value={t}>{children}</I18nContext.Provider>;
}

export function useT(): TFunction {
  return useContext(I18nContext);
}
