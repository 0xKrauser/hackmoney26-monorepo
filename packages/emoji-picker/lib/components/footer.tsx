// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: Copyright (c) 2022 fowlerro

import { EmojiPickerClasses } from '../types.js';
import { getCustomEmoji, emojiNameWithColons, getEmojiCharacter, cn } from '../utils.js';
import type { CustomCategory, EmojiType } from '../types.js';

interface FooterProps {
  activeEmoji: EmojiType;
  selectedSkinTone: number;
  customCategories: CustomCategory[];
}

export const Footer = ({ activeEmoji, selectedSkinTone, customCategories }: FooterProps) => {
  const emoji = activeEmoji
    ? 'id' in activeEmoji
      ? getCustomEmoji(activeEmoji.id, activeEmoji.animated)
      : getEmojiCharacter(activeEmoji, selectedSkinTone)
    : null;

  const category =
    activeEmoji && 'id' in activeEmoji && customCategories.find(cat => cat.name === activeEmoji.serverName);

  return (
    <div
      className={cn(
        EmojiPickerClasses.footer,
        'flex h-12 items-center gap-2 bg-zinc-800 px-4',
        'pointer-events-none select-none overflow-hidden text-ellipsis whitespace-nowrap text-left',
      )}>
      {emoji && (
        <span className={cn(EmojiPickerClasses.footerEmoji, 'font-emoji text-[1.75rem]')}>
          {activeEmoji && 'id' in activeEmoji ? (
            <img src={emoji} width={28} height={28} alt={activeEmoji.name} />
          ) : (
            emoji
          )}
        </span>
      )}
      <div
        className={cn(
          EmojiPickerClasses.footerEmojiText,
          'flex flex-col overflow-hidden text-ellipsis whitespace-nowrap font-sans text-zinc-200',
        )}>
        <span className="overflow-hidden text-ellipsis whitespace-nowrap font-sans text-base font-medium leading-5 text-zinc-200">
          {activeEmoji ? emojiNameWithColons(activeEmoji) : null}
        </span>
        {category && (
          <span className="font-sans text-[11px] leading-4 text-zinc-400">
            from <strong className="font-extrabold">{category.name}</strong>
          </span>
        )}
      </div>
      {category && (
        <img
          className={cn(EmojiPickerClasses.footerEmojiServerIcon, 'ml-auto rounded-lg')}
          src={category.iconURL}
          width={32}
          height={32}
          alt={category.name}
        />
      )}
    </div>
  );
};
