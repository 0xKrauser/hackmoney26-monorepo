// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: Copyright (c) 2022 fowlerro

import { EmojiCategoryHeader } from './emoji-category-header.js';
import { useEmojiPickerContext } from '../context.js';
import { EmojiPickerClasses } from '../types.js';
import { getCustomEmoji, getEmoji, filterEmojis, cn } from '../utils.js';
import { useState } from 'react';
import type { CategoryNames, CategoryRefs, EmojiCategory, EmojiType, OnEmojiClick, SetActiveEmoji } from '../types.js';

interface EmojisCategoryProps {
  refs: CategoryRefs;
  onEmojiClick?: OnEmojiClick;
  emojiCategory: EmojiCategory;
  search: string;
  selectedSkinTone: number;
  setActiveEmoji: SetActiveEmoji;
  categoryNames: CategoryNames;
}

export const EmojisCategory = ({
  refs,
  onEmojiClick,
  emojiCategory,
  search,
  selectedSkinTone,
  setActiveEmoji,
  categoryNames,
}: EmojisCategoryProps) => {
  const [expanded, setExpanded] = useState(true);
  const { setFrequentlyUsed } = useEmojiPickerContext();

  const filteredEmojis = emojiCategory.emojis.filter(emoji => filterEmojis(emoji, search));

  const handleClick = (emoji: EmojiType) => {
    const emojiToSave: EmojiType = {
      ...emoji,
      ...('id' in emoji && { serverName: emojiCategory.name }),
    };
    setFrequentlyUsed(emojis => {
      if (emojis.find(e => e.name === emojiToSave.name)) {
        return [
          emojiToSave,
          ...emojis.filter(e => {
            if ('id' in emoji) return !('id' in e) || e.id !== emoji.id;
            return e.name !== emoji.name;
          }),
        ];
      }
      return [emojiToSave, ...emojis].splice(0, 18);
    });
    onEmojiClick?.(emojiToSave);
  };

  const handleHover = (emoji: EmojiType) => {
    setActiveEmoji({
      ...emoji,
      ...('id' in emoji && !emoji.serverName ? { serverName: emojiCategory.name } : null),
    });
  };

  if (!filteredEmojis.length) return null;

  return (
    <div
      className={cn(EmojiPickerClasses.emojiListGroup, 'w-full flex-1')}
      ref={element => {
        if (refs.current) refs.current[emojiCategory.name] = element;
      }}>
      <EmojiCategoryHeader
        expanded={expanded}
        setExpanded={setExpanded}
        emojiCategory={emojiCategory}
        categoryNames={categoryNames}
      />
      {expanded ? (
        <ul
          className={cn(
            'm-0 mb-3 ml-1 list-none overflow-x-auto p-0',
            'grid grid-cols-9 gap-0',
            'scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent',
          )}>
          {filteredEmojis.map(item => {
            const emoji = 'id' in item ? item : getEmoji(item, selectedSkinTone);

            return (
              <li key={emoji.name} className={cn(EmojiPickerClasses.emojiListGroupItem, 'm-0 p-0')}>
                {'id' in emoji ? (
                  <button
                    type="button"
                    className={cn(
                      'font-emoji m-0 h-10 w-10 cursor-pointer rounded border-0 bg-transparent p-0 text-[28px]',
                      'hover:bg-zinc-600',
                    )}
                    onMouseEnter={() => handleHover(emoji)}
                    onClick={() => handleClick(emoji)}>
                    <img src={getCustomEmoji(emoji.id, emoji.animated)} width={32} height={32} alt={emoji.name} />
                  </button>
                ) : (
                  <button
                    type="button"
                    className={cn(
                      'font-emoji m-0 h-10 w-10 cursor-pointer rounded border-0 bg-transparent p-0 text-[28px]',
                      'hover:bg-zinc-600',
                    )}
                    onMouseEnter={() => handleHover(emoji)}
                    onClick={() => handleClick(emoji)}>
                    {emoji.char}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
};
