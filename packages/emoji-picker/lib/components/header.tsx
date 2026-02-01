// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: Copyright (c) 2022 fowlerro

import { SearchIcon } from '../icons/search-icon.js';
import { XMarkIcon } from '../icons/x-mark-icon.js';
import { EmojiPickerClasses } from '../types.js';
import { emojiNameWithColons, cn } from '../utils.js';
import { useRef } from 'react';
import type { EmojiType, SetSearch, SetSelectedSkinTone } from '../types.js';
import type { RefObject } from 'react';

interface HeaderProps {
  activeEmoji: EmojiType;
  selectedSkinTone: number;
  setSelectedSkinTone: SetSelectedSkinTone;
  search: string;
  setSearch: SetSearch;
}

const SKIN_TONES = ['👏', '👏🏻', '👏🏼', '👏🏽', '👏🏾', '👏🏿'];

const Header = ({ activeEmoji, search, setSearch, selectedSkinTone, setSelectedSkinTone }: HeaderProps) => (
  <div
    className={cn(EmojiPickerClasses.header, 'z-10 col-span-2 flex h-12 items-center bg-zinc-800 px-4 py-2 shadow-sm')}>
    <SearchInput activeEmoji={activeEmoji} search={search} setSearch={setSearch} />
    <SkinToneSelector selectedSkinTone={selectedSkinTone} setSelectedSkinTone={setSelectedSkinTone} />
  </div>
);

interface SearchInputProps {
  activeEmoji: EmojiType;
  search: string;
  setSearch: SetSearch;
}

const SearchInput = ({ activeEmoji, search, setSearch }: SearchInputProps) => {
  const placeholder = activeEmoji ? emojiNameWithColons(activeEmoji) : 'Find the perfect emoji';

  return (
    <div
      className={cn(
        EmojiPickerClasses.inputSearch,
        'flex flex-1 cursor-text items-center rounded bg-zinc-900',
        'focus-within:outline focus-within:outline-2 focus-within:outline-sky-500',
      )}>
      <input
        type="text"
        placeholder={placeholder}
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full border-0 bg-transparent px-2 text-base leading-8 text-zinc-200 placeholder:text-zinc-500 focus:outline-none"
      />
      <div className="mx-4 h-5">
        {!search ? (
          <SearchIcon className="text-zinc-400" />
        ) : (
          <button
            type="button"
            className="inline-flex cursor-pointer items-center justify-center border-0 bg-transparent p-0"
            onClick={() => setSearch('')}
            aria-label="Clear search">
            <XMarkIcon className="cursor-pointer text-zinc-400 hover:text-zinc-200" />
          </button>
        )}
      </div>
    </div>
  );
};

interface SkinToneSelectorProps {
  selectedSkinTone: number;
  setSelectedSkinTone: SetSelectedSkinTone;
}

const SkinToneSelector = ({ selectedSkinTone, setSelectedSkinTone }: SkinToneSelectorProps) => {
  const selectorRef = useRef<HTMLDetailsElement>(null);

  return (
    <details
      ref={selectorRef}
      className={cn(
        EmojiPickerClasses.skinToneSelector,
        'ml-2 cursor-pointer select-none overflow-hidden rounded-t',
        '[&[open]>*]:bg-zinc-900',
      )}>
      <summary className="list-none py-1">
        <span className="font-emoji rounded p-1 text-xl hover:bg-zinc-700/40">{SKIN_TONES[selectedSkinTone]}</span>
      </summary>
      <SkinToneList
        selectorRef={selectorRef}
        selectedSkinTone={selectedSkinTone}
        setSelectedSkinTone={setSelectedSkinTone}
      />
    </details>
  );
};

interface SkinToneListProps {
  selectorRef: RefObject<HTMLDetailsElement | null>;
  selectedSkinTone: number;
  setSelectedSkinTone: SetSelectedSkinTone;
}

const SkinToneList = ({ selectorRef, selectedSkinTone, setSelectedSkinTone }: SkinToneListProps) => (
  <div className="absolute flex flex-col rounded-b">
    {SKIN_TONES.filter((_, i) => i !== selectedSkinTone).map(skinTone => (
      <button
        type="button"
        key={skinTone}
        className={cn(
          EmojiPickerClasses.skinToneSelectorItem,
          'font-emoji w-full cursor-pointer border-0 bg-transparent p-1 text-left text-xl hover:bg-zinc-700/40',
        )}
        onClick={() => {
          setSelectedSkinTone(SKIN_TONES.indexOf(skinTone));
          if (selectorRef.current) selectorRef.current.open = false;
        }}>
        {skinTone}
      </button>
    ))}
  </div>
);

export { Header };
