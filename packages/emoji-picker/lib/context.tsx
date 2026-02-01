// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: Copyright (c) 2022 fowlerro

import { frequentlyUsedStorage } from './storage.js';
import { createContext, useContext, useMemo, useSyncExternalStore } from 'react';
import type { EmojiType } from './types.js';
import type { ReactNode } from 'react';

type SetFrequentlyUsed = (value: EmojiType[] | ((value: EmojiType[]) => EmojiType[])) => void;

interface EmojiPickerContextValues {
  frequentlyUsed: EmojiType[];
  setFrequentlyUsed: SetFrequentlyUsed;
}

interface EmojiPickerProviderProps {
  children: ReactNode;
}

const EmojiPickerContext = createContext<EmojiPickerContextValues>({} as EmojiPickerContextValues);

const useEmojiPickerContext = () => {
  const context = useContext(EmojiPickerContext);
  if (!context) {
    throw new Error('useEmojiPickerContext must be used within an EmojiPickerProvider');
  }
  return context;
};

const EMPTY_FREQUENTLY_USED: EmojiType[] = [];

const EmojiPickerProvider = ({ children }: EmojiPickerProviderProps) => {
  const frequentlyUsed =
    useSyncExternalStore(
      frequentlyUsedStorage.subscribe,
      frequentlyUsedStorage.getSnapshot,
      () => EMPTY_FREQUENTLY_USED, // Server snapshot fallback
    ) ?? EMPTY_FREQUENTLY_USED;

  const setFrequentlyUsed: SetFrequentlyUsed = async valueOrUpdate => {
    await frequentlyUsedStorage.set(valueOrUpdate);
  };

  const value = useMemo(() => ({ frequentlyUsed, setFrequentlyUsed }), [frequentlyUsed]);

  return <EmojiPickerContext.Provider value={value}>{children}</EmojiPickerContext.Provider>;
};

export type { SetFrequentlyUsed };
export { useEmojiPickerContext, EmojiPickerProvider };
