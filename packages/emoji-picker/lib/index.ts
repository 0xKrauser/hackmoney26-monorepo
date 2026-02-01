// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: Copyright (c) 2022 fowlerro

// Main component
export { EmojiPicker } from './emoji-picker.js';
export { EmojiPickerContent } from './emoji-picker-content.js';

// Context
export { EmojiPickerProvider, useEmojiPickerContext } from './context.js';

// Types
export type {
  Emoji,
  CustomEmoji,
  EmojiType,
  EmojiCategory,
  Emojis,
  EmojiCategories,
  CategoryNames,
  CustomCategory,
  CategoryElements,
  CategoryRefs,
  OnEmojiClick,
  SetActiveEmoji,
  SetSearch,
  SetSelectedSkinTone,
  EmojiPickerProps,
  EmojiPickerContentProps,
} from './types.js';

export { emojiCategories, defaultEmojiCategories, EmojiPickerClasses } from './types.js';

// Utils
export { cn, emojiNameWithColons, getEmojiCharacter, getEmoji, getCustomEmoji, filterEmojis } from './utils.js';

// Storage (chrome extension compatible)
export { frequentlyUsedStorage } from './storage.js';
export type { FrequentlyUsedStorageType } from './storage.js';

// Icons (for customization)
export { SearchIcon } from './icons/search-icon.js';
export { XMarkIcon } from './icons/x-mark-icon.js';
export { LeftArrowIcon } from './icons/left-arrow-icon.js';
export { CategoryIcon } from './icons/category-icon.js';

// Components (for customization)
export { Header } from './components/header.js';
export { CategoryList } from './components/category-list.js';
export { EmojiList } from './components/emoji-list.js';
export { EmojisCategory } from './components/emojis-category.js';
export { EmojiCategoryHeader } from './components/emoji-category-header.js';
export { Footer } from './components/footer.js';
