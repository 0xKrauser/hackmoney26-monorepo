// SPDX-License-Identifier: MIT
// Registry so that opening one emoji picker closes any other open picker (single-open behavior).

type SetOpen = (open: boolean) => void;

const pickers = new Map<string, SetOpen>();

export const registerPicker = (id: string, setOpen: SetOpen): (() => void) => {
  pickers.set(id, setOpen);
  return () => {
    pickers.delete(id);
  };
};

export const closeOtherPickers = (exceptId: string): void => {
  pickers.forEach((setOpen, id) => {
    if (id !== exceptId) {
      setOpen(false);
    }
  });
};
