// SPDX-FileCopyrightText: Copyright (c) 2023 Plasmo Corp. <foss@plasmo.com> (https://www.plasmo.com) and contributors
// SPDX-License-Identifier: MIT

import type { CSUI, CSUIAnchor, CSUIMountState } from './types.js';

type InsertPosition = 'beforebegin' | 'afterbegin' | 'beforeend' | 'afterend';

type ElementInsertOptions = {
  element: Element;
  insertPosition?: InsertPosition;
};

const createShadowDOM = async <T>(Mount: CSUI<T>) => {
  const shadowHost = document.createElement('plasmo-csui');

  const shadowRoot =
    typeof Mount.createShadowRoot === 'function'
      ? await Mount.createShadowRoot(shadowHost)
      : shadowHost.attachShadow({ mode: 'open' });

  const shadowContainer = document.createElement('div');

  shadowContainer.id = 'plasmo-shadow-container';
  shadowContainer.style.zIndex = '2147483647';
  shadowContainer.style.position = 'relative';

  shadowRoot.appendChild(shadowContainer);

  return {
    shadowHost,
    shadowRoot,
    shadowContainer,
  };
};

type CSUIShadowDOM = Awaited<ReturnType<typeof createShadowDOM>>;

const injectAnchor = async <T>(
  Mount: CSUI<T>,
  anchor: CSUIAnchor,
  { shadowHost, shadowRoot }: CSUIShadowDOM,
  mountState?: CSUIMountState,
) => {
  if (typeof Mount.getStyle === 'function') {
    const sfcStyleContent = typeof Mount.getSfcStyleContent === 'function' ? await Mount.getSfcStyleContent() : '';
    shadowRoot.prepend(await Mount.getStyle({ ...anchor, sfcStyleContent }));
  }

  if (typeof Mount.getShadowHostId === 'function') {
    shadowHost.id = await Mount.getShadowHostId(anchor);
  }

  if (typeof Mount.mountShadowHost === 'function') {
    await Mount.mountShadowHost({
      shadowHost,
      anchor,
      mountState,
    });
  } else if (anchor.type === 'inline') {
    anchor.element.insertAdjacentElement(anchor.insertPosition || 'afterend', shadowHost);
  } else {
    document.documentElement.prepend(shadowHost);
  }
};

const createShadowContainerInternal = async <T>(Mount: CSUI<T>, anchor: CSUIAnchor, mountState?: CSUIMountState) => {
  const shadowDom = await createShadowDOM(Mount);

  mountState?.hostSet.add(shadowDom.shadowHost);
  mountState?.hostMap.set(shadowDom.shadowHost, anchor);

  await injectAnchor(Mount, anchor, shadowDom, mountState);

  return shadowDom.shadowContainer;
};

const isVisible = (el: Element) => {
  if (!el) {
    return false;
  }
  const elementRect = el.getBoundingClientRect();
  const elementStyle = globalThis.getComputedStyle(el);

  if (elementStyle.display === 'none') {
    return false;
  }

  if (elementStyle.visibility === 'hidden') {
    return false;
  }

  if (elementStyle.opacity === '0') {
    return false;
  }

  if (elementRect.width === 0 && elementRect.height === 0 && elementStyle.overflow !== 'hidden') {
    return false;
  }

  // Check if the element is irrevocably off-screen:
  if (elementRect.x + elementRect.width < 0 || elementRect.y + elementRect.height < 0) {
    return false;
  }

  return true;
};

const createAnchorObserverInternal = <T>(Mount: CSUI<T>) => {
  const mountState: CSUIMountState = {
    document: document || window.document,
    observer: null,

    mountInterval: null,

    isMounting: false,
    isMutated: false,

    hostSet: new Set(),
    hostMap: new WeakMap(),

    overlayTargetList: [],
  };

  const isMounted = (el: Element | null) =>
    el?.id ? !!document.getElementById(el.id) : el?.getRootNode({ composed: true }) === mountState.document;

  const hasInlineAnchor = typeof Mount.getInlineAnchor === 'function';
  const hasOverlayAnchor = typeof Mount.getOverlayAnchor === 'function';

  const hasInlineAnchorList = typeof Mount.getInlineAnchorList === 'function';
  const hasOverlayAnchorList = typeof Mount.getOverlayAnchorList === 'function';

  const shouldObserve = hasInlineAnchor || hasOverlayAnchor || hasInlineAnchorList || hasOverlayAnchorList;

  if (!shouldObserve) {
    return null;
  }

  const mountAnchors = async (render: (anchor?: CSUIAnchor) => void) => {
    mountState.isMounting = true;

    const mountedInlineAnchorSet = new WeakSet();

    // There should only be 1 overlay mount
    let overlayHost: Element | null = null;

    // Go through mounted sets and check if they are still mounted
    for (const el of mountState.hostSet) {
      const anchor = mountState.hostMap.get(el);
      const anchorExists = anchor?.element ? document.contains(anchor.element) : false;
      if (isMounted(el) && anchorExists) {
        if (anchor?.type === 'inline') {
          mountedInlineAnchorSet.add(anchor.element);
        } else if (anchor?.type === 'overlay') {
          overlayHost = el;
        }
      } else {
        anchor?.root?.unmount();
        // Clean up the plasmo-csui element
        el.remove();
        mountState.hostSet.delete(el);
      }
    }

    const [inlineAnchor, inlineAnchorList, overlayAnchor, overlayAnchorList] = await Promise.all([
      hasInlineAnchor ? Mount.getInlineAnchor() : null,
      hasInlineAnchorList ? Mount.getInlineAnchorList() : null,
      hasOverlayAnchor ? Mount.getOverlayAnchor() : null,
      hasOverlayAnchorList ? Mount.getOverlayAnchorList() : null,
    ]);

    const renderList: CSUIAnchor[] = [];

    if (inlineAnchor) {
      if (inlineAnchor instanceof Element) {
        if (!mountedInlineAnchorSet.has(inlineAnchor)) {
          renderList.push({
            element: inlineAnchor,
            type: 'inline',
          });
        }
      } else if (inlineAnchor.element instanceof Element && !mountedInlineAnchorSet.has(inlineAnchor.element)) {
        renderList.push({
          element: inlineAnchor.element,
          type: 'inline',
          insertPosition: inlineAnchor.insertPosition,
        });
      }
    }

    if ((inlineAnchorList?.length || 0) > 0 && inlineAnchorList) {
      // Handle both NodeList and ElementInsertOptionsList
      for (let i = 0; i < inlineAnchorList.length; i++) {
        const item = (inlineAnchorList as NodeList | ElementInsertOptions[])[i] as Element | ElementInsertOptions;
        if (item instanceof Element && !mountedInlineAnchorSet.has(item)) {
          renderList.push({
            element: item,
            type: 'inline',
          });
        } else if ('element' in item && item.element instanceof Element && !mountedInlineAnchorSet.has(item.element)) {
          renderList.push({
            element: item.element,
            type: 'inline',
            insertPosition: item.insertPosition,
          });
        }
      }
    }

    const overlayTargetList: Element[] = [];

    if (overlayAnchor && isVisible(overlayAnchor)) {
      overlayTargetList.push(overlayAnchor);
    }

    if ((overlayAnchorList?.length || 0) > 0 && overlayAnchorList) {
      for (let i = 0; i < overlayAnchorList.length; i++) {
        const el = overlayAnchorList[i] as Element;
        if (el instanceof Element && isVisible(el)) {
          overlayTargetList.push(el);
        }
      }
    }

    if (overlayTargetList.length > 0) {
      mountState.overlayTargetList = overlayTargetList;
      if (!overlayHost) {
        renderList.push({
          element: document.documentElement,
          type: 'overlay',
        });
      } else {
        // force re-render
      }
    } else {
      overlayHost?.remove();
      if (overlayHost) {
        mountState.hostSet.delete(overlayHost);
      }
    }

    await Promise.all(renderList.map(render));

    if (mountState.isMutated) {
      mountState.isMutated = false;
      await mountAnchors(render);
    }

    mountState.isMounting = false;
  };

  const start = (render: (anchor?: CSUIAnchor) => void) => {
    mountState.observer = new MutationObserver(() => {
      if (mountState.isMounting) {
        mountState.isMutated = true;
        return;
      }
      mountAnchors(render);
    });

    // Need to watch the subtree for shadowDOM
    mountState.observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    mountState.mountInterval = setInterval(() => {
      if (mountState.isMounting) {
        mountState.isMutated = true;
        return;
      }
      mountAnchors(render);
    }, 142);
  };

  return {
    start,
    mountState,
  };
};

const createRenderInternal = <T>(
  Mount: CSUI<T>,
  containers: [T, T],
  mountState?: CSUIMountState,
  renderFx?: (anchor: CSUIAnchor, rootContainer: Element) => Promise<void>,
) => {
  const createRootContainer = (anchor?: CSUIAnchor) => {
    if (!anchor) {
      anchor = {
        element: document.documentElement,
        type: 'overlay',
      };
    }
    return typeof Mount.getRootContainer === 'function'
      ? Mount.getRootContainer({
          anchor,
          mountState,
        })
      : createShadowContainerInternal(Mount, anchor, mountState);
  };

  if (typeof Mount.render === 'function') {
    return (anchor: CSUIAnchor) =>
      Mount.render(
        {
          anchor,
          createRootContainer,
        },
        ...containers,
      );
  }

  return async (anchor: CSUIAnchor) => {
    const rootContainer = await createRootContainer(anchor);
    return renderFx?.(anchor, rootContainer);
  };
};

// Exports at the end
export type { CSUIShadowDOM };
export const createShadowContainer = createShadowContainerInternal;
export const createAnchorObserver = createAnchorObserverInternal;
export const createRender = createRenderInternal;
