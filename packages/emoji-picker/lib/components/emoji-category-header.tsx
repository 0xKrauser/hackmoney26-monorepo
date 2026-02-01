// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: Copyright (c) 2022 fowlerro

import { CategoryIcon } from '../icons/category-icon.js';
import { LeftArrowIcon } from '../icons/left-arrow-icon.js';
import { EmojiPickerClasses } from '../types.js';
import { cn } from '../utils.js';
import type { CategoryNames, CustomCategory, EmojiCategories } from '../types.js';

interface EmojiCategoryHeaderProps {
  emojiCategory: CustomCategory;
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
  categoryNames: CategoryNames;
}

export const EmojiCategoryHeader = ({
  emojiCategory,
  expanded,
  setExpanded,
  categoryNames,
}: EmojiCategoryHeaderProps) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setExpanded(!expanded);
    }
  };

  return (
    <div
      className={cn(
        EmojiPickerClasses.emojiListGroupHeader,
        'sticky top-0 flex h-8 select-none items-center bg-zinc-700 px-2',
      )}>
      <div
        role="button"
        tabIndex={0}
        className={cn(
          'flex items-center text-xs font-semibold uppercase text-zinc-400',
          'cursor-pointer transition-colors hover:text-white',
        )}
        onClick={() => setExpanded(!expanded)}
        onKeyDown={handleKeyDown}>
        {'iconURL' in emojiCategory ? (
          <img src={emojiCategory.iconURL} alt={emojiCategory.name} width="16" height="16" className="rounded" />
        ) : (
          <CategoryIcon category={emojiCategory.name as EmojiCategories} width="16" height="16" />
        )}
        <span className="mx-2">{categoryNames?.[emojiCategory.name as EmojiCategories] ?? emojiCategory.name}</span>
        <LeftArrowIcon
          width="16"
          height="16"
          style={{
            transition: 'transform .1s',
            transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
          }}
        />
      </div>
    </div>
  );
};
