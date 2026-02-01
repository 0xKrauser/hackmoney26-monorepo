// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: Copyright (c) 2022 fowlerro

import { EmojiPickerContent } from './emoji-picker-content.js';
import { closeOtherPickers, registerPicker } from './picker-registry.js';
import { cn } from './utils.js';
import * as Popover from '@radix-ui/react-popover';
import { useCallback, useEffect, useId, useState } from 'react';
import type { EmojiPickerProps } from './types.js';

export const EmojiPicker = ({
  children,
  onEmojiClick,
  customEmojis,
  categoryNames,
  className,
  side = 'bottom',
  align = 'start',
  sideOffset = 5,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  defaultOpen,
  container,
}: EmojiPickerProps) => {
  const id = useId();
  const [internalOpen, setInternalOpen] = useState(defaultOpen ?? false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) {
        setInternalOpen(next);
      }
      controlledOnOpenChange?.(next);
    },
    [isControlled, controlledOnOpenChange],
  );

  // When uncontrolled, register so other pickers can be closed when this one opens
  useEffect(() => {
    if (isControlled) return;
    return registerPicker(id, setInternalOpen);
  }, [id, isControlled]);

  const handleTriggerClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (open) {
        setOpen(false);
        return;
      }
      if (!isControlled) {
        closeOtherPickers(id);
      }
      setOpen(true);
    },
    [open, setOpen, isControlled, id],
  );

  const handleInteractOutside = useCallback(
    (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      // The outside interaction is typically pointerdown; the link activates on "click".
      // Prevent the upcoming click from reaching the target (link/button) so only the modal closes.
      const preventClick = (clickEvent: Event) => {
        clickEvent.preventDefault();
        clickEvent.stopPropagation();
        document.removeEventListener('click', preventClick, true);
      };
      document.addEventListener('click', preventClick, true);
      setTimeout(() => document.removeEventListener('click', preventClick, true), 0);
    },
    [setOpen],
  );

  const content = (
    <Popover.Content
      className={cn('z-[2147483647] outline-none', className)}
      side={side}
      align={align}
      sideOffset={sideOffset}
      onInteractOutside={handleInteractOutside}>
      <EmojiPickerContent onEmojiClick={onEmojiClick} customEmojis={customEmojis} categoryNames={categoryNames} />
    </Popover.Content>
  );

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild onClick={handleTriggerClick}>
        {children}
      </Popover.Trigger>
      <Popover.Portal container={container ?? undefined}>{content}</Popover.Portal>
    </Popover.Root>
  );
};
