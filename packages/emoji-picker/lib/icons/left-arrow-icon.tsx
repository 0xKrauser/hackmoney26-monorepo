// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: Copyright (c) 2022 fowlerro

import type { SVGAttributes } from 'react';

export const LeftArrowIcon = (props: SVGAttributes<SVGSVGElement>) => (
  <svg width="20" height="20" viewBox="0 0 24 24" {...props}>
    <path
      fill="currentColor"
      fillRule="evenodd"
      clipRule="evenodd"
      d="M16.59 8.59004L12 13.17L7.41 8.59004L6 10L12 16L18 10L16.59 8.59004Z"
    />
  </svg>
);
