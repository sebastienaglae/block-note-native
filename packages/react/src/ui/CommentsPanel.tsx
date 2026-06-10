import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { createId, inlineToString, type Editor } from "@sebastienaglae/bnn-core";
import type { Theme } from "../theme/theme";
import { Icon } from "../icons/Icon";
import { I18nProvider, useT, type TFunction } from "../i18n/I18nContext";
import { IconsProvider, type IconOverrides } from "../icons/IconContext";

export interface CommentsPanelProps {
  editor: Editor;
  theme: Theme;
  blockId: string;
  author?: string;
  width?: number;
  onClose: () => void;
  /** Provided for standalone use; inherited when rendered inside BlockNoteView. */
  t?: TFunction;
  icons?: IconOverrides;
}

function CommentsPanelInner({ editor, theme, blockId, author = "You", width = 320, onClose }: CommentsPanelProps): JSX.Element {
  const t = useT();
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const comments = editor.getComments(blockId);
  const block = editor.getBlock(blockId);
  const snippet = block ? inlineToString(block.content).slice(0, 80) : "";

  const timeAgo = (ms: number): string => {
    const m = Math.floor((Date.now() - ms) / 60000);
    if (m < 1) return t("bnn.comments.justNow", "just now");
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  };

  const add = () => {
    const text = draft.trim();
    if (!text) return;
    editor.addComment(blockId, { id: createId(), author, text, createdAt: Date.now() });
    setDraft("");
  };

  const TextBtn = ({ label, onPress, danger, accent }: { label: string; onPress: () => void; danger?: boolean; accent?: boolean }) => (
    <Pressable onPress={onPress}>
      <Text style={{ color: danger ? "#e03e3e" : accent ? theme.colors.accent : theme.colors.textSecondary, fontSize: 12 }}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={{ width, backgroundColor: theme.colors.background, borderLeftWidth: 1, borderLeftColor: theme.colors.border }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
        <Icon name="comment" size={16} color={theme.colors.text} />
        <Text style={{ flex: 1, fontWeight: "700", color: theme.colors.text }}>
          {t("bnn.comments.title", "Comments")}
          {comments.length ? ` (${comments.length})` : ""}
        </Text>
        <Pressable onPress={onClose} style={{ padding: 4 }} accessibilityLabel={t("bnn.comments.cancel", "Cancel")}>
          <Icon name="close" size={16} color={theme.colors.textSecondary} />
        </Pressable>
      </View>

      {snippet ? (
        <Text numberOfLines={2} style={{ paddingHorizontal: 14, paddingVertical: 8, color: theme.colors.textSecondary, fontSize: 12, fontStyle: "italic" }}>
          “{snippet}”
        </Text>
      ) : null}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12 }}>
        {comments.length === 0 ? <Text style={{ color: theme.colors.placeholder, fontSize: 13 }}>{t("bnn.comments.none", "No comments yet")}</Text> : null}
        {comments.map((c) => (
          <View key={c.id} style={{ marginBottom: 12, padding: 10, borderRadius: 8, backgroundColor: theme.colors.backgroundSecondary, opacity: c.resolved ? 0.6 : 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: theme.colors.accent, alignItems: "center", justifyContent: "center", marginRight: 8 }}>
                <Text style={{ color: theme.colors.onAccent, fontSize: 11, fontWeight: "700" }}>{c.author.slice(0, 1).toUpperCase()}</Text>
              </View>
              <Text style={{ fontWeight: "600", color: theme.colors.text, fontSize: 13 }}>{c.author}</Text>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 11, marginLeft: 6 }}>{timeAgo(c.createdAt)}</Text>
              {c.resolved ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginLeft: 6 }}>
                  <Icon name="check" size={11} color={theme.colors.textSecondary} />
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>{t("bnn.comments.resolved", "resolved")}</Text>
                </View>
              ) : null}
            </View>

            {editingId === c.id ? (
              <View>
                <TextInput value={editDraft} onChangeText={setEditDraft} multiline style={{ color: theme.colors.text, fontSize: 13, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 6, padding: 6 }} />
                <View style={{ flexDirection: "row", gap: 12, marginTop: 6 }}>
                  <TextBtn label={t("bnn.comments.save", "Save")} accent onPress={() => { editor.updateComment(blockId, c.id, { text: editDraft.trim() || c.text }); setEditingId(null); }} />
                  <TextBtn label={t("bnn.comments.cancel", "Cancel")} onPress={() => setEditingId(null)} />
                </View>
              </View>
            ) : (
              <Text style={{ color: theme.colors.text, fontSize: 13, textDecorationLine: c.resolved ? "line-through" : "none" }}>{c.text}</Text>
            )}

            {editingId === c.id ? null : (
              <View style={{ flexDirection: "row", gap: 12, marginTop: 6 }}>
                <TextBtn label={c.resolved ? t("bnn.comments.reopen", "Reopen") : t("bnn.comments.resolve", "Resolve")} onPress={() => editor.updateComment(blockId, c.id, { resolved: !c.resolved })} />
                <TextBtn label={t("bnn.comments.edit", "Edit")} onPress={() => { setEditingId(c.id); setEditDraft(c.text); }} />
                <TextBtn label={t("bnn.comments.delete", "Delete")} danger onPress={() => editor.removeComment(blockId, c.id)} />
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      <View style={{ padding: 12, borderTopWidth: 1, borderTopColor: theme.colors.border }}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={t("bnn.comments.add", "Add a comment…")}
          placeholderTextColor={theme.colors.placeholder}
          multiline
          style={{ color: theme.colors.text, fontSize: 13, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, padding: 8, minHeight: 40, backgroundColor: theme.colors.background }}
        />
        <Pressable onPress={add} style={{ marginTop: 8, alignSelf: "flex-end", flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: theme.colors.accent, borderRadius: 6, paddingHorizontal: 14, paddingVertical: 7 }}>
          <Icon name="send" size={13} color={theme.colors.onAccent} />
          <Text style={{ color: theme.colors.onAccent, fontSize: 13, fontWeight: "600" }}>{t("bnn.comments.send", "Comment")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** Standalone comments panel — place it anywhere; pass t/icons for standalone use. */
export function CommentsPanel(props: CommentsPanelProps): JSX.Element {
  return (
    <I18nProvider t={props.t}>
      <IconsProvider icons={props.icons}>
        <CommentsPanelInner {...props} />
      </IconsProvider>
    </I18nProvider>
  );
}
