// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: Copyright (c) 2022 fowlerro

/* eslint-disable import-x/no-deprecated -- MutableRefObject required for refs we mutate (refs.current[name] = el) */
import type { MutableRefObject, ReactNode } from 'react';

// Emoji types
interface Emoji {
  name: string;
  char: string;
  hasTone?: boolean;
  tones?: EmojiToneType[];
}

interface EmojiToneType {
  name: Emoji['name'];
  char: Emoji['char'];
  tone: number[];
}

interface CustomEmoji {
  id: string;
  name: string;
  animated: boolean;
  serverName?: string;
}

type EmojiType = Emoji | CustomEmoji;

// Category types
const emojiCategories = [
  'frequentlyUsed',
  'people',
  'nature',
  'food',
  'activities',
  'travel',
  'objects',
  'symbols',
  'flags',
] as const;

type EmojiCategories = (typeof emojiCategories)[number];

const defaultEmojiCategories: Record<EmojiCategories, string> = {
  frequentlyUsed: 'Frequently used',
  people: 'People',
  nature: 'Nature',
  food: 'Food',
  activities: 'Activities',
  travel: 'Travel',
  objects: 'Objects',
  symbols: 'Symbols',
  flags: 'Flags',
};

type CategoryNames = {
  [category in EmojiCategories]: string;
};

type CustomCategory = {
  name: string;
  iconURL?: string;
};

interface EmojiCategory {
  name: string;
  iconURL?: string;
  emojis: EmojiType[];
}

type Emojis = EmojiCategory[];

type CategoryElements = {
  [category: string]: HTMLDivElement | null;
};

type CategoryRefs = MutableRefObject<CategoryElements>;

// Callback types
type OnEmojiClick = (emoji: EmojiType) => void;
type SetActiveEmoji = (emoji: EmojiType) => void;
type SetSearch = (search: string) => void;
type SetSelectedSkinTone = (skinTone: number) => void;

// Component props (Radix-style API)
interface EmojiPickerProps {
  /** The trigger element (button, etc.) */
  children: ReactNode;
  /** Callback when an emoji is clicked */
  onEmojiClick?: OnEmojiClick;
  /** Custom emoji categories */
  customEmojis?: EmojiCategory[];
  /** Custom category display names */
  categoryNames?: Partial<CategoryNames>;
  /** Additional class name for the popover content */
  className?: string;
  /** Popover side position */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Popover alignment */
  align?: 'start' | 'center' | 'end';
  /** Offset from the trigger */
  sideOffset?: number;
  /** Controlled open state */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Default open state for uncontrolled usage */
  defaultOpen?: boolean;
  /** Container element for the portal (use for Shadow DOM) - if not provided, renders inline without portal */
  container?: HTMLElement | null;
}

// Content props (internal)
interface EmojiPickerContentProps {
  onEmojiClick?: OnEmojiClick;
  customEmojis?: EmojiCategory[];
  categoryNames?: Partial<CategoryNames>;
}

// CSS class names for styling customization
const EmojiPickerClasses = {
  root: 'emoji-picker',
  header: 'emoji-picker-header',
  inputSearch: 'emoji-picker-input-search',
  skinToneSelector: 'emoji-picker-skin-tone-selector',
  skinToneSelectorItem: 'emoji-picker-skin-tone-selector-item',
  categoryList: 'emoji-picker-category-list',
  categoryListItem: 'emoji-picker-category-list-item',
  categoryListCustomItem: 'emoji-picker-category-list-custom-item',
  emojiList: 'emoji-picker-emoji-list',
  emojiListGroup: 'emoji-picker-emoji-list-group',
  emojiListGroupHeader: 'emoji-picker-emoji-list-group-header',
  emojiListGroupItem: 'emoji-picker-emoji-list-item',
  footer: 'emoji-picker-footer',
  footerEmoji: 'emoji-picker-footer-emoji',
  footerEmojiText: 'emoji-picker-footer-emoji-text',
  footerEmojiServerIcon: 'emoji-picker-footer-emoji-server-icon',
} as const;

export type {
  Emoji,
  CustomEmoji,
  EmojiType,
  EmojiCategories,
  CategoryNames,
  CustomCategory,
  EmojiCategory,
  Emojis,
  CategoryElements,
  CategoryRefs,
  OnEmojiClick,
  SetActiveEmoji,
  SetSearch,
  SetSelectedSkinTone,
  EmojiPickerProps,
  EmojiPickerContentProps,
};
export { emojiCategories, defaultEmojiCategories, EmojiPickerClasses };
