// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: Copyright (c) 2022 fowlerro

import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Emoji, EmojiType } from './types.js';
import type { ClassValue } from 'clsx';

/**
 * Utility function to merge Tailwind CSS classes
 * Uses clsx for conditional classes and tailwind-merge for deduplication
 */
const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const DISCORD_CDN_BASE_URL = 'https://cdn.discordapp.com';

/**
 * Get Discord custom emoji URL
 */
const getCustomEmoji = (emojiId: string, animated: boolean): string =>
  `${DISCORD_CDN_BASE_URL}/emojis/${emojiId}.${animated ? 'gif' : 'png'}`;

/**
 * Format emoji name with colons (e.g., ":smile:")
 */
const emojiNameWithColons = (emoji: EmojiType): string =>
  emoji.name
    .split(' ')
    .map(name => `:${name}:`)
    .join(' ');

/**
 * Get emoji character with skin tone applied
 */
const getEmojiCharacter = (emoji: Emoji, selectedTone: number): string => {
  if (selectedTone) {
    return emoji.tones?.find(e => e.tone.includes(selectedTone))?.char ?? emoji.char;
  }
  return emoji.char;
};

/**
 * Get emoji with skin tone applied (returns full emoji object)
 */
const getEmoji = (emoji: Emoji, selectedTone: number): Emoji => {
  if (selectedTone) {
    return emoji.tones?.find(e => e.tone.includes(selectedTone)) ?? emoji;
  }
  return emoji;
};

/**
 * Filter emojis by search query
 */
const filterEmojis = (emoji: EmojiType, search: string): boolean =>
  emoji.name.split(' ').some(name => `:${name}:`.includes(search));

export { cn, getCustomEmoji, emojiNameWithColons, getEmojiCharacter, getEmoji, filterEmojis };
