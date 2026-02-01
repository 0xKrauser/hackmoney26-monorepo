// SPDX-FileCopyrightText: Copyright (c) 2023 Plasmo Corp. <foss@plasmo.com> (https://www.plasmo.com) and contributors
// SPDX-License-Identifier: MIT

import { useEffect, useState } from 'react';
import type { CSUIContainerProps } from '../types.js';

export const OverlayCSUIContainer = (props: CSUIContainerProps) => {
  const [top, setTop] = useState(0);
  const [left, setLeft] = useState(0);

  const { anchor, watchOverlayAnchor } = props;

  useEffect(() => {
    // Handle overlay repositioning
    if (anchor?.type !== 'overlay') {
      return;
    }

    const updatePosition = async () => {
      const rect = anchor?.element?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      const pos = {
        left: rect.left + window.scrollX,
        top: rect.top + window.scrollY,
      };

      setLeft(pos.left);
      setTop(pos.top);
    };

    updatePosition();

    const unwatch = watchOverlayAnchor?.(updatePosition);
    window.addEventListener('scroll', updatePosition);
    window.addEventListener('resize', updatePosition);

    return () => {
      if (typeof unwatch === 'function') {
        unwatch();
      }
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [anchor, watchOverlayAnchor]);

  return (
    <div
      id={props.id}
      className="plasmo-csui-container"
      style={{
        display: 'flex',
        position: 'absolute',
        top,
        left,
      }}>
      {props.children}
    </div>
  );
};

export const InlineCSUIContainer = (props: CSUIContainerProps) => (
  <div
    id="plasmo-inline"
    className="plasmo-csui-container"
    style={{
      display: 'flex',
      position: 'relative',
      top: 0,
      left: 0,
    }}>
    {props.children}
  </div>
);
