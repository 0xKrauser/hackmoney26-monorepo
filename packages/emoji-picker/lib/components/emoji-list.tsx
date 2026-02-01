// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: Copyright (c) 2022 fowlerro

import { EmojisCategory } from './emojis-category.js';
import { useEmojiPickerContext } from '../context.js';
import { EmojiPickerClasses } from '../types.js';
import { cn } from '../utils.js';
import { memo, forwardRef } from 'react';
import type { CategoryNames, CategoryRefs, EmojiCategory, Emojis, OnEmojiClick, SetActiveEmoji } from '../types.js';
import type { ForwardedRef } from 'react';

interface EmojiListProps {
  emojis: Emojis;
  customEmojis: EmojiCategory[] | undefined;
  refs: CategoryRefs;
  onEmojiClick?: OnEmojiClick;
  categoryNames: CategoryNames;
  search: string;
  selectedSkinTone: number;
  setActiveEmoji: SetActiveEmoji;
}

const EmojiListComponent = (
  { emojis, customEmojis, refs, onEmojiClick, categoryNames, search, selectedSkinTone, setActiveEmoji }: EmojiListProps,
  ref: ForwardedRef<HTMLDivElement>,
) => (
  <div
    ref={ref}
    className={cn(
      EmojiPickerClasses.emojiList,
      'z-0 overflow-x-hidden overflow-y-scroll pr-0',
      'scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent',
    )}>
    <FrequentlyUsedCategory
      refs={refs}
      emojis={customEmojis}
      categoryNames={categoryNames}
      search={search}
      selectedSkinTone={selectedSkinTone}
      setActiveEmoji={setActiveEmoji}
      onEmojiClick={onEmojiClick}
    />
    <EmojiCategories
      refs={refs}
      emojis={customEmojis}
      categoryNames={categoryNames}
      search={search}
      selectedSkinTone={selectedSkinTone}
      setActiveEmoji={setActiveEmoji}
      onEmojiClick={onEmojiClick}
    />
    <EmojiCategories
      refs={refs}
      emojis={emojis}
      categoryNames={categoryNames}
      search={search}
      selectedSkinTone={selectedSkinTone}
      setActiveEmoji={setActiveEmoji}
      onEmojiClick={onEmojiClick}
    />
  </div>
);

interface EmojiCategoryProps {
  refs: CategoryRefs;
  emojis: EmojiCategory[] | undefined;
  categoryNames: CategoryNames;
  search: string;
  selectedSkinTone: number;
  setActiveEmoji: SetActiveEmoji;
  onEmojiClick?: OnEmojiClick;
}

const FrequentlyUsedCategory = ({
  refs,
  emojis,
  categoryNames,
  search,
  selectedSkinTone,
  setActiveEmoji,
  onEmojiClick,
}: EmojiCategoryProps) => {
  const { frequentlyUsed } = useEmojiPickerContext();

  const customEmojiCategories = emojis?.map(emojiCategory => emojiCategory.name);

  const emojiCategory = {
    name: 'frequentlyUsed',
    emojis: frequentlyUsed.filter(
      emoji => !('id' in emoji) || !emoji.serverName || customEmojiCategories?.includes(emoji.serverName),
    ),
  };

  return (
    <EmojisCategory
      emojiCategory={emojiCategory}
      categoryNames={categoryNames}
      refs={refs}
      onEmojiClick={onEmojiClick}
      search={search}
      selectedSkinTone={selectedSkinTone}
      setActiveEmoji={setActiveEmoji}
    />
  );
};

const EmojiCategories = ({
  refs,
  emojis,
  categoryNames,
  search,
  selectedSkinTone,
  setActiveEmoji,
  onEmojiClick,
}: EmojiCategoryProps) => {
  if (!emojis) return null;

  return (
    <>
      {emojis.map(emojiCategory => (
        <EmojisCategory
          key={emojiCategory.name}
          emojiCategory={emojiCategory}
          categoryNames={categoryNames}
          refs={refs}
          onEmojiClick={onEmojiClick}
          search={search}
          selectedSkinTone={selectedSkinTone}
          setActiveEmoji={setActiveEmoji}
        />
      ))}
    </>
  );
};

export const EmojiList = memo(forwardRef(EmojiListComponent));
