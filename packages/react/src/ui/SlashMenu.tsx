import { Fragment } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import type { Theme } from "../theme/theme";
import type { SlashMenuItem } from "../types";
import { Icon } from "../icons/Icon";
import type { IconName } from "../icons/iconNames";
import { useT } from "../i18n/I18nContext";

export interface SlashMenuProps {
  theme: Theme;
  items: SlashMenuItem[];
  activeIndex: number;
  position: { top: number; left: number } | null;
  query: string;
  onSelect: (item: SlashMenuItem) => void;
  onHover: (index: number) => void;
}

const GROUP_KEYS: Record<string, string> = {
  "Basic blocks": "bnn.slash.group.basic",
  Lists: "bnn.slash.group.lists",
  Media: "bnn.slash.group.media",
  Advanced: "bnn.slash.group.advanced",
  Inline: "bnn.slash.group.inline",
  Custom: "bnn.slash.group.custom",
};

export function SlashMenu(props: SlashMenuProps): JSX.Element | null {
  const { theme, items, activeIndex, position, query, onSelect, onHover } = props;
  const t = useT();
  if (!position && Platform.OS === "web") return null;

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
          width: 280,
          maxHeight: 360,
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
      {/* Search bar (#19): shows the active query */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          marginHorizontal: 6,
          marginBottom: 4,
          paddingHorizontal: 8,
          paddingVertical: 6,
          borderRadius: 6,
          backgroundColor: theme.colors.backgroundSecondary,
        }}
      >
        <Icon name="search" size={14} color={theme.colors.textSecondary} />
        <Text style={{ flex: 1, fontSize: 13, color: query ? theme.colors.text : theme.colors.placeholder }}>
          {query || t("bnn.slash.search", "Search blocks…")}
        </Text>
      </View>

      {items.length === 0 ? (
        <Text style={{ color: theme.colors.placeholder, fontSize: 13, paddingHorizontal: 12, paddingVertical: 8 }}>
          {t("bnn.slash.empty", "No blocks found")}
        </Text>
      ) : null}

      <ScrollView keyboardShouldPersistTaps="always" style={{ maxHeight: 312 }}>
        {items.map((item, i) => {
          const groupName = item.group ?? "";
          const showGroup = groupName && groupName !== lastGroup;
          lastGroup = groupName;
          const isActive = i === activeIndex;
          const groupLabel = GROUP_KEYS[groupName] ? t(GROUP_KEYS[groupName], groupName) : groupName;
          return (
            <Fragment key={item.key}>
              {showGroup ? (
                <Text style={{ fontSize: 11, fontWeight: "600", color: theme.colors.textSecondary, paddingHorizontal: 10, paddingTop: 8, paddingBottom: 2, textTransform: "uppercase" }}>
                  {groupLabel}
                </Text>
              ) : null}
              <Pressable
                onPress={() => onSelect(item)}
                onHoverIn={() => onHover(i)}
                style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 6, marginHorizontal: 4, borderRadius: 6, backgroundColor: isActive ? theme.colors.menuHover : "transparent" }}
              >
                <View style={{ width: 34, height: 34, borderRadius: 6, borderWidth: 1, borderColor: theme.colors.border, alignItems: "center", justifyContent: "center", marginRight: 10, backgroundColor: theme.colors.background }}>
                  {item.emoji ? (
                    <Text style={{ fontSize: 16 }}>{item.emoji}</Text>
                  ) : (
                    <Icon name={(item.icon as IconName) ?? "text"} size={17} color={theme.colors.text} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: "500" }}>
                    {item.titleKey ? t(item.titleKey, item.title) : item.title}
                  </Text>
                  {item.subtitle ? (
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                      {item.subtitleKey ? t(item.subtitleKey, item.subtitle) : item.subtitle}
                    </Text>
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
