import { Fragment } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import type { Theme } from "../theme/theme";
import type { SlashMenuItem } from "../types";

export interface SlashMenuProps {
  theme: Theme;
  items: SlashMenuItem[];
  activeIndex: number;
  position: { top: number; left: number } | null;
  query: string;
  onSelect: (item: SlashMenuItem) => void;
  onHover: (index: number) => void;
}

export function SlashMenu(props: SlashMenuProps): JSX.Element | null {
  const { theme, items, activeIndex, position, onSelect, onHover } = props;
  if (items.length === 0) return null;

  const containerStyle =
    Platform.OS === "web"
      ? ({ position: "fixed" as const, top: position?.top ?? 0, left: position?.left ?? 0 } as object)
      : ({ position: "absolute" as const, top: 40, left: 16, right: 16 } as object);

  let lastGroup: string | undefined;

  return (
    <View
      style={[
        containerStyle,
        {
          width: 260,
          maxHeight: 320,
          backgroundColor: theme.colors.menuBackground,
          borderRadius: theme.radius + 2,
          borderWidth: 1,
          borderColor: theme.colors.border,
          paddingVertical: 4,
          shadowColor: "#000",
          shadowOpacity: 0.18,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
          elevation: 8,
          zIndex: 1000,
        },
      ]}
    >
      <ScrollView keyboardShouldPersistTaps="always" style={{ maxHeight: 312 }}>
        {items.map((item, i) => {
          const showGroup = item.group && item.group !== lastGroup;
          lastGroup = item.group;
          const isActive = i === activeIndex;
          return (
            <Fragment key={item.key}>
              {showGroup ? (
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "600",
                    color: theme.colors.textSecondary,
                    paddingHorizontal: 10,
                    paddingTop: 8,
                    paddingBottom: 2,
                    textTransform: "uppercase",
                  }}
                >
                  {item.group}
                </Text>
              ) : null}
              <Pressable
                onPress={() => onSelect(item)}
                onHoverIn={() => onHover(i)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 8,
                  paddingVertical: 6,
                  marginHorizontal: 4,
                  borderRadius: 6,
                  backgroundColor: isActive ? theme.colors.menuHover : "transparent",
                }}
              >
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 10,
                    backgroundColor: theme.colors.background,
                  }}
                >
                  <Text style={{ color: theme.colors.text, fontSize: 15 }}>{item.icon ?? "▦"}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: "500" }}>{item.title}</Text>
                  {item.subtitle ? (
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>{item.subtitle}</Text>
                  ) : null}
                </View>
              </Pressable>
            </Fragment>
          );
        })}
      </ScrollView>
    </View>
  );
}
