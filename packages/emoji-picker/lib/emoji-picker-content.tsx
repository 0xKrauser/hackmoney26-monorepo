// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: Copyright (c) 2022 fowlerro

import emojis from './assets/emojis.json' with { type: 'json' };
import { CategoryList } from './components/category-list.js';
import { EmojiList } from './components/emoji-list.js';
import { Footer } from './components/footer.js';
import { Header } from './components/header.js';
import { EmojiPickerProvider } from './context.js';
import { defaultEmojiCategories, EmojiPickerClasses } from './types.js';
import { cn } from './utils.js';
import { useMemo, useRef, useState } from 'react';
import type {
  CategoryElements,
  CategoryNames,
  CustomCategory,
  EmojiPickerContentProps,
  EmojiType,
  Emojis,
} from './types.js';

// Import emojis data - will be resolved at build time

export const EmojiPickerContent = ({ onEmojiClick, customEmojis, categoryNames }: EmojiPickerContentProps) => {
  const [activeEmoji, setActiveEmoji] = useState<EmojiType>((emojis as Emojis)[0].emojis[0]);
  const [selectedSkinTone, setSelectedSkinTone] = useState(0);
  const [search, setSearch] = useState('');

  const categoryRefs = useRef<CategoryElements>({});
  const memoCategoryNames: CategoryNames = useMemo(
    () => ({
      ...defaultEmojiCategories,
      ...categoryNames,
    }),
    [categoryNames],
  );
  const customCategories: CustomCategory[] =
    customEmojis?.map(category => ({ name: category.name, iconURL: category.iconURL })) ?? [];

  return (
    <EmojiPickerProvider>
      <div
        className={cn(
          EmojiPickerClasses.root,
          'relative z-[9999] h-[444px] max-w-[422px] rounded-lg bg-zinc-700 font-sans text-zinc-400',
          'grid grid-cols-[48px_auto] grid-rows-[auto_1fr_auto] overflow-hidden shadow-lg',
        )}>
        <Header
          activeEmoji={activeEmoji}
          search={search}
          setSearch={setSearch}
          selectedSkinTone={selectedSkinTone}
          setSelectedSkinTone={setSelectedSkinTone}
        />
        <CategoryList refs={categoryRefs} customCategories={customCategories} />
        <EmojiList
          emojis={emojis as Emojis}
          customEmojis={customEmojis}
          refs={categoryRefs}
          onEmojiClick={onEmojiClick}
          categoryNames={memoCategoryNames}
          search={search}
          selectedSkinTone={selectedSkinTone}
          setActiveEmoji={setActiveEmoji}
        />
        <Footer activeEmoji={activeEmoji} selectedSkinTone={selectedSkinTone} customCategories={customCategories} />
      </div>
    </EmojiPickerProvider>
  );
};
