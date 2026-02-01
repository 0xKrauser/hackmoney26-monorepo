// SPDX-FileCopyrightText: Copyright (c) 2023 Plasmo Corp. <foss@plasmo.com> (https://www.plasmo.com) and contributors
// SPDX-License-Identifier: MIT

import { Fragment } from 'react';
import type { FC, ReactNode } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getLayout = (RawImport: any): FC<{ children: ReactNode }> =>
  typeof RawImport.Layout === 'function'
    ? RawImport.Layout
    : typeof RawImport.getGlobalProvider === 'function'
      ? RawImport.getGlobalProvider()
      : Fragment;
