/** Default block renderers. All use React Native primitives so they run on web (via RNW) and native. */
import { Image, Pressable, Text, View } from "react-native";
import type { BlockRenderProps, BlockRenderer } from "../../types";
import { Icon } from "../../icons/Icon";
import { extraBlockRenderers } from "./extraBlocks";
import { MediaEmpty } from "./mediaParts";

const Paragraph: BlockRenderer = ({ InlineContentView }) =>
  InlineContentView({ textStyle: { fontSize: 16 }, placeholder: "bnn.ph.paragraph" });

const Heading: BlockRenderer = ({ block, InlineContentView }) => {
  const level = Number(block.props.level) || 1;
  const sizes: Record<number, number> = { 1: 30, 2: 24, 3: 20 };
  const weights: Record<number, "600" | "700"> = { 1: "700", 2: "700", 3: "600" };
  return InlineContentView({
    textStyle: { fontSize: sizes[level], fontWeight: weights[level], lineHeight: sizes[level] * 1.25 },
    placeholder: "bnn.ph.heading",
  });
};

const BulletListItem: BlockRenderer = ({ theme, InlineContentView }) => (
  <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
    <Text style={{ fontSize: 16, lineHeight: 24, color: theme.colors.text, width: 24, textAlign: "center" }}>
      •
    </Text>
    <View style={{ flex: 1 }}>{InlineContentView({ textStyle: { fontSize: 16 }, placeholder: "bnn.ph.list" })}</View>
  </View>
);

const NumberedListItem: BlockRenderer = ({ theme, listIndex, InlineContentView }) => (
  <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
    <Text style={{ fontSize: 16, lineHeight: 24, color: theme.colors.text, minWidth: 24, textAlign: "right", marginRight: 6 }}>
      {listIndex ?? 1}.
    </Text>
    <View style={{ flex: 1 }}>{InlineContentView({ textStyle: { fontSize: 16 }, placeholder: "bnn.ph.list" })}</View>
  </View>
);

const CheckListItem: BlockRenderer = ({ block, editor, theme, InlineContentView }) => {
  const checked = !!block.props.checked;
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
      <Pressable
        onPress={() => editor.updateBlock(block.id, { props: { checked: !checked } })}
        style={{
          width: 18,
          height: 18,
          borderRadius: 4,
          borderWidth: 1.5,
          borderColor: checked ? theme.colors.accent : theme.colors.border,
          backgroundColor: checked ? theme.colors.accent : "transparent",
          alignItems: "center",
          justifyContent: "center",
          marginRight: 8,
          marginTop: 3,
        }}
      >
        {checked ? <Icon name="check" size={12} color={theme.colors.onAccent} /> : null}
      </Pressable>
      <View style={{ flex: 1, opacity: checked ? 0.55 : 1 }}>
        {InlineContentView({
          textStyle: {
            fontSize: 16,
            color: checked ? theme.colors.textSecondary : theme.colors.text,
          },
          placeholder: "bnn.ph.todo",
        })}
      </View>
    </View>
  );
};

const Quote: BlockRenderer = ({ theme, InlineContentView }) => (
  <View style={{ flexDirection: "row" }}>
    <View style={{ width: 3, borderRadius: 2, backgroundColor: theme.colors.quoteBar, marginRight: 12 }} />
    <View style={{ flex: 1 }}>
      {InlineContentView({ textStyle: { fontSize: 16, fontStyle: "italic" }, placeholder: "bnn.ph.quote" })}
    </View>
  </View>
);

const CodeBlock: BlockRenderer = ({ block, theme, InlineContentView }) => (
  <View
    style={{
      backgroundColor: theme.colors.codeBackground,
      borderRadius: theme.radius,
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.accent,
      paddingVertical: 12,
      paddingHorizontal: 14,
    }}
  >
    <Text style={{ fontSize: 11, color: theme.colors.accent, marginBottom: 6, fontFamily: theme.monoFamily, fontWeight: "600" }}>
      {String(block.props.language || "text")}
    </Text>
    {InlineContentView({
      textStyle: { fontSize: 14, fontFamily: theme.monoFamily, color: theme.colors.text },
      placeholder: "bnn.ph.code",
    })}
  </View>
);

const Divider: BlockRenderer = ({ theme }) => (
  <View style={{ paddingVertical: 8 }}>
    <View style={{ height: 1, backgroundColor: theme.colors.divider }} />
  </View>
);

const ImageBlock: BlockRenderer = ({ block, editor, theme }) => {
  const url = String(block.props.url || "");
  const caption = String(block.props.caption || "");
  if (!url) {
    return (
      <MediaEmpty
        editor={editor}
        blockId={block.id}
        propKey="url"
        icon="image"
        theme={theme}
        labelKey="bnn.media.addImage"
        labelFallback="Add an image"
        phKey="bnn.media.urlImage"
        phFallback="Image URL"
      />
    );
  }
  return (
    <View>
      <Image
        source={{ uri: url }}
        resizeMode="contain"
        style={{ width: "100%", height: 260, borderRadius: theme.radius, backgroundColor: theme.colors.backgroundSecondary }}
      />
      {caption ? (
        <Text style={{ color: theme.colors.textSecondary, fontSize: 13, marginTop: 6, textAlign: "center" }}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
};

export const defaultBlockRenderers: Record<string, BlockRenderer> = {
  paragraph: Paragraph,
  heading: Heading,
  bulletListItem: BulletListItem,
  numberedListItem: NumberedListItem,
  checkListItem: CheckListItem,
  quote: Quote,
  codeBlock: CodeBlock,
  divider: Divider,
  image: ImageBlock,
  ...extraBlockRenderers,
};

export type { BlockRenderProps };
