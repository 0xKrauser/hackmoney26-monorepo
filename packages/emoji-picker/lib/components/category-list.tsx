// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: Copyright (c) 2022 fowlerro

import { useEmojiPickerContext } from '../context.js';
import { CategoryIcon } from '../icons/category-icon.js';
import { emojiCategories, EmojiPickerClasses } from '../types.js';
import { cn } from '../utils.js';
import { memo } from 'react';
import type { CategoryRefs, CustomCategory, EmojiCategories } from '../types.js';
import type { KeyboardEvent } from 'react';

interface CategoryListProps {
  refs: CategoryRefs;
  customCategories: CustomCategory[];
}

const CategoryListComponent = ({ refs, customCategories }: CategoryListProps) => {
  const { frequentlyUsed } = useEmojiPickerContext();

  return (
    <div
      className={cn(
        EmojiPickerClasses.categoryList,
        'row-span-2 overflow-y-auto overflow-x-hidden rounded-bl-lg bg-zinc-900',
        'flex flex-col items-center py-3 pr-0',
        'scrollbar-none',
      )}>
      {frequentlyUsed.length ? <CategoryItem category="frequentlyUsed" categoryRefs={refs} /> : null}
      <CustomCategories refs={refs} customCategories={customCategories} />
      {emojiCategories
        .filter(category => category !== 'frequentlyUsed')
        .map(category => (
          <CategoryItem key={category} category={category} categoryRefs={refs} />
        ))}
    </div>
  );
};

const CustomCategories = ({ refs, customCategories }: CategoryListProps) => {
  if (!customCategories?.length) return null;

  return (
    <>
      {customCategories.map(category => (
        <CustomCategoryItem key={category.name} category={category} refs={refs} />
      ))}
      <hr className="my-3 w-8 border-0 border-b border-zinc-700/50" />
    </>
  );
};

interface CategoryItemProps {
  category: EmojiCategories;
  categoryRefs: CategoryRefs;
}

const CategoryItem = ({ category, categoryRefs }: CategoryItemProps) => {
  const handleClick = () => {
    categoryRefs.current[category]?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        EmojiPickerClasses.categoryListItem,
        'h-6 w-6 cursor-pointer rounded p-1 text-zinc-400 transition-colors',
        'hover:bg-zinc-700/40 hover:text-zinc-200',
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}>
      <CategoryIcon category={category} />
    </div>
  );
};

interface CustomCategoryItemProps {
  category: CustomCategory;
  refs: CategoryRefs;
}

const CustomCategoryItem = ({ category, refs }: CustomCategoryItemProps) => {
  const handleClick = () => {
    refs.current[category.name]?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        EmojiPickerClasses.categoryListCustomItem,
        'h-8 w-8 cursor-pointer p-1',
        '[&>img]:rounded-full [&>img]:transition-[border-radius] [&>img]:hover:rounded-lg',
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}>
      <img src={category.iconURL} alt={category.name} width="32" height="32" />
    </div>
  );
};

export const CategoryList = memo(CategoryListComponent);
