/**
 * React 19's @types/react removed the global `JSX` namespace (it now lives under
 * `React.JSX`). This shim restores the global namespace so existing `JSX.Element`
 * return annotations keep working across the monorepo.
 */
import type * as React from "react";

declare global {
  namespace JSX {
    type ElementType = React.JSX.ElementType;
    type Element = React.JSX.Element;
    type ElementClass = React.JSX.ElementClass;
    type ElementAttributesProperty = React.JSX.ElementAttributesProperty;
    type ElementChildrenAttribute = React.JSX.ElementChildrenAttribute;
    type LibraryManagedAttributes<C, P> = React.JSX.LibraryManagedAttributes<C, P>;
    type IntrinsicAttributes = React.JSX.IntrinsicAttributes;
    type IntrinsicClassAttributes<T> = React.JSX.IntrinsicClassAttributes<T>;
    type IntrinsicElements = React.JSX.IntrinsicElements;
  }
}

export {};
