/**
 * Minimal ambient types for `react-native` so @bnn/react type-checks without
 * pulling in the full React Native types. At runtime this resolves to
 * react-native-web (web) or react-native (native) via the bundler.
 *
 * Intentionally loose — real RN type-safety applies when building the native app
 * against the actual react-native types.
 */
declare module "react-native" {
  import type { ComponentType, ReactNode, Ref } from "react";

  export type StyleProp = any;

  export interface LayoutEvent {
    nativeEvent: { layout: { x: number; y: number; width: number; height: number } };
  }
  export interface ScrollEvent {
    nativeEvent: { contentOffset: { x: number; y: number } };
  }
  export interface SelectionEvent {
    nativeEvent: { selection: { start: number; end: number } };
  }
  export interface KeyPressEvent {
    nativeEvent: { key: string };
  }

  export interface ViewProps {
    style?: StyleProp;
    children?: ReactNode;
    pointerEvents?: "auto" | "none" | "box-none" | "box-only";
    onLayout?: (e: LayoutEvent) => void;
    accessibilityLabel?: string;
    ref?: Ref<any>;
    [key: string]: any;
  }
  export const View: ComponentType<ViewProps>;
  export type View = any;

  export const Text: ComponentType<{ style?: StyleProp; children?: ReactNode; [key: string]: any }>;
  export type Text = any;

  export interface PressableProps {
    style?: StyleProp | ((state: { pressed: boolean; hovered?: boolean }) => StyleProp);
    onPress?: () => void;
    onHoverIn?: () => void;
    onHoverOut?: () => void;
    children?: ReactNode;
    accessibilityLabel?: string;
    [key: string]: any;
  }
  export const Pressable: ComponentType<PressableProps>;

  export interface TextInputProps {
    style?: StyleProp;
    value?: string;
    multiline?: boolean;
    editable?: boolean;
    scrollEnabled?: boolean;
    placeholder?: string;
    placeholderTextColor?: string;
    selection?: { start: number; end: number };
    onChangeText?: (text: string) => void;
    onKeyPress?: (e: KeyPressEvent) => void;
    onSelectionChange?: (e: SelectionEvent) => void;
    onFocus?: () => void;
    onBlur?: () => void;
    children?: ReactNode;
    ref?: Ref<any>;
    [key: string]: any;
  }
  export const TextInput: ComponentType<TextInputProps>;
  export type TextInput = any;

  export interface ScrollViewProps {
    style?: StyleProp;
    contentContainerStyle?: StyleProp;
    keyboardShouldPersistTaps?: "always" | "never" | "handled";
    onScroll?: (e: ScrollEvent) => void;
    scrollEventThrottle?: number;
    onLayout?: (e: LayoutEvent) => void;
    children?: ReactNode;
    ref?: Ref<any>;
    [key: string]: any;
  }
  export const ScrollView: ComponentType<ScrollViewProps>;
  export type ScrollView = any;

  export const Image: ComponentType<{ source?: any; style?: StyleProp; resizeMode?: string; [key: string]: any }>;

  export const Platform: { OS: "web" | "ios" | "android" | "windows" | "macos"; select<T>(spec: Record<string, T>): T };

  export const StyleSheet: {
    create<T extends Record<string, any>>(styles: T): T;
    flatten(style: StyleProp): any;
    hairlineWidth: number;
    absoluteFill: any;
  };

  export interface PanResponderInstance {
    panHandlers: Record<string, unknown>;
  }
  export interface PanResponderGestureState {
    moveX: number;
    moveY: number;
    dx: number;
    dy: number;
  }
  export const PanResponder: {
    create(config: Record<string, (...args: any[]) => any>): PanResponderInstance;
  };

  export const SafeAreaView: ComponentType<ViewProps>;
  export const KeyboardAvoidingView: ComponentType<ViewProps & { behavior?: string }>;
}
