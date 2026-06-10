/**
 * Native editable surface (iOS / Android). A controlled multiline `TextInput`
 * that renders styled `<Text>` segments as children for live inline styling,
 * and diffs `onChangeText` to keep the inline-content model in sync.
 *
 * Note: web (incl. Expo web) uses `RichTextInput.tsx` instead.
 */
import { useEffect, useRef } from "react";
import { Text, TextInput, View } from "react-native";
import {
  inlineToString,
  isLink,
  isStyledText,
  spliceInline,
  stylesAt,
  type CustomInlineContent,
  type InlineContent,
  type Styles,
} from "@bnn/core";
import type { BlockTextStyle, RichTextInputProps } from "../types";
import type { Theme } from "../theme/theme";

function stylesToRN(styles: Styles, theme: Theme): Record<string, unknown> {
  const s: Record<string, unknown> = {};
  if (styles.bold) s.fontWeight = "700";
  if (styles.italic) s.fontStyle = "italic";
  const deco: string[] = [];
  if (styles.underline) deco.push("underline");
  if (styles.strike) deco.push("line-through");
  if (deco.length) s.textDecorationLine = deco.join(" ");
  if (styles.code) {
    s.fontFamily = theme.monoFamily;
    s.backgroundColor = theme.colors.codeBackground;
    s.color = theme.colors.code;
  }
  if (styles.textColor && styles.textColor !== "default") {
    s.color = theme.textColors[styles.textColor] ?? styles.textColor;
  }
  if (styles.backgroundColor && styles.backgroundColor !== "default") {
    s.backgroundColor = theme.highlightColors[styles.backgroundColor] ?? styles.backgroundColor;
  }
  return s;
}

function textStyleToRN(textStyle: BlockTextStyle | undefined, theme: Theme): Record<string, unknown> {
  return {
    color: textStyle?.color ?? theme.colors.text,
    fontSize: textStyle?.fontSize ?? 16,
    fontWeight: textStyle?.fontWeight ?? "400",
    lineHeight: textStyle?.lineHeight,
    fontStyle: textStyle?.fontStyle ?? "normal",
    fontFamily: textStyle?.fontFamily ?? theme.fontFamily,
  };
}

/** Finds the single contiguous change between two strings. */
function diffText(
  oldStr: string,
  newStr: string,
): { from: number; to: number; inserted: string } {
  let p = 0;
  const min = Math.min(oldStr.length, newStr.length);
  while (p < min && oldStr[p] === newStr[p]) p++;
  let s = 0;
  while (s < min - p && oldStr[oldStr.length - 1 - s] === newStr[newStr.length - 1 - s]) s++;
  return { from: p, to: oldStr.length - s, inserted: newStr.slice(p, newStr.length - s) };
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
  } = props;

  const inputRef = useRef<TextInput | null>(null);
  const selRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });
  const valueRef = useRef(inlineToString(content));
  valueRef.current = inlineToString(content);

  useEffect(() => {
    if (active && editable) inputRef.current?.focus();
  }, [active, editable]);

  const handleChangeText = (next: string) => {
    const prev = valueRef.current;
    const { from, to, inserted } = diffText(prev, next);
    // Enter -> split the block instead of inserting a newline.
    if (inserted === "\n" && to === from) {
      onEnter?.(from);
      return;
    }
    const carry = stylesAt(content, from);
    const piece: InlineContent[] = inserted ? [{ type: "text", text: inserted, styles: carry }] : [];
    const newContent = spliceInline(content, from, to, piece);
    const caret = from + inserted.length;
    selRef.current = { start: caret, end: caret };
    onChange(newContent, selRef.current);
  };

  const handleKeyPress = (e: { nativeEvent: { key: string } }) => {
    if (e.nativeEvent.key === "Backspace" && selRef.current.start === 0 && selRef.current.end === 0) {
      onBackspaceAtStart?.();
    }
  };

  const renderChildren = () => {
    if (content.length === 0) return null;
    return content.map((ic, i) => {
      if (isStyledText(ic)) {
        return (
          <Text key={i} style={stylesToRN(ic.styles, theme)}>
            {ic.text}
          </Text>
        );
      }
      if (isLink(ic)) {
        return (
          <Text key={i} style={{ color: theme.colors.accent, textDecorationLine: "underline" }}>
            {ic.content.map((t) => t.text).join("")}
          </Text>
        );
      }
      return (
        <Text key={i}>{renderCustomInline ? renderCustomInline(ic as CustomInlineContent) : null}</Text>
      );
    });
  };

  const baseStyle = textStyleToRN(textStyle, theme);

  return (
    <View style={{ position: "relative" }}>
      <TextInput
        ref={inputRef}
        multiline
        editable={editable}
        scrollEnabled={false}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.placeholder}
        selection={active && selection ? selection : undefined}
        onChangeText={handleChangeText}
        onKeyPress={handleKeyPress}
        onSelectionChange={(e: {
          nativeEvent: { selection: { start: number; end: number } };
        }) => {
          selRef.current = e.nativeEvent.selection;
          onSelectionChange(e.nativeEvent.selection);
        }}
        onFocus={() => onFocus?.()}
        onBlur={() => onBlur?.()}
        style={[
          baseStyle,
          { padding: 0, margin: 0, textAlignVertical: "top", minHeight: (baseStyle.fontSize as number) * 1.4 },
        ]}
      >
        {renderChildren()}
      </TextInput>
    </View>
  );
}
