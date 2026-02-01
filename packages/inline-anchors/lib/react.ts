// SPDX-FileCopyrightText: Copyright (c) 2023 Plasmo Corp. <foss@plasmo.com> (https://www.plasmo.com) and contributors
// SPDX-License-Identifier: MIT

import { Fragment } from 'react';
import type { FC, ReactNode } from 'react';

interface RawImportModule {
  Layout?: FC<{ children: ReactNode }>;
  getGlobalProvider?: () => FC<{ children: ReactNode }>;
}

export const getLayout = (RawImport: RawImportModule): FC<{ children: ReactNode }> =>
  typeof RawImport.Layout === 'function'
    ? RawImport.Layout
    : typeof RawImport.getGlobalProvider === 'function'
      ? RawImport.getGlobalProvider()
      : Fragment;
