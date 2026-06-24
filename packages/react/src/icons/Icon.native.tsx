/** Native icon (lucide-react-native). Static imports for tree-shaking. iOS / Android only. */
import {
  Plus, GripVertical, ChevronRight, ChevronDown, FileText, MoreHorizontal, Star, Trash2, Pencil,
  CornerUpRight, Folder, Copy, Check, X, Send, Type, Heading1, Heading2, Heading3, List,
  ListOrdered, ListChecks, Quote, Code, Minus, Image, Video, Music, Paperclip, Bookmark, MapPin,
  Table, Link, Unlink, Smile, Search, Lock, LockOpen, Undo2, Redo2, Sun, Moon, CaseSensitive,
  ImagePlus, RemoveFormatting, Bold, Italic, Underline, Strikethrough, FileSymlink, Highlighter,
  Palette, Square, Play, Pause, Menu,
} from "lucide-react-native";
import type { ComponentType } from "react";
import type { IconName } from "./iconNames";
import { useIconOverride } from "./IconContext";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LucideComp = ComponentType<any>;

const ICONS: Record<IconName, LucideComp> = {
  add: Plus, plus: Plus, drag: GripVertical, chevronRight: ChevronRight, chevronDown: ChevronDown,
  page: FileText, more: MoreHorizontal, star: Star, trash: Trash2, rename: Pencil, move: CornerUpRight,
  folder: Folder, copy: Copy, check: Check, close: X, send: Send, text: Type, h1: Heading1,
  h2: Heading2, h3: Heading3, bulletList: List, numberedList: ListOrdered, checkList: ListChecks,
  quote: Quote, code: Code, divider: Minus, image: Image, video: Video, audio: Music, file: Paperclip,
  bookmark: Bookmark, map: MapPin, table: Table, link: Link, unlink: Unlink, emoji: Smile, search: Search,
  lock: Lock, unlock: LockOpen, undo: Undo2, redo: Redo2, sun: Sun, moon: Moon, font: CaseSensitive,
  cover: ImagePlus, removeFormat: RemoveFormatting, bold: Bold, italic: Italic, underline: Underline,
  strike: Strikethrough, pageLink: FileSymlink, highlighter: Highlighter, palette: Palette,
  play: Play, pause: Pause, menu: Menu,
};

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  fill?: string;
}

export function Icon({ name, size = 16, color = "#000", strokeWidth = 2, fill }: IconProps): JSX.Element {
  const Override = useIconOverride(name);
  if (Override) return <Override size={size} color={color} />;
  const Comp = ICONS[name] ?? Square;
  // lucide icons are stroke-based; passing `fill={undefined}` lets react-native-svg
  // default the fill to black and flood the glyph. Force "none" unless a fill is asked for.
  return <Comp size={size} color={color} strokeWidth={strokeWidth} fill={fill ?? "none"} />;
}
