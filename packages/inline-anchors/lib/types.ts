// SPDX-FileCopyrightText: Copyright (c) 2023 Plasmo Corp. <foss@plasmo.com> (https://www.plasmo.com) and contributors
// SPDX-License-Identifier: MIT

import type * as React from 'react';
import type { Root } from 'react-dom/client';

type Async<T> = Promise<T> | T;

type Getter<T, P = unknown> = (props?: P) => Async<T>;

type InsertPosition = 'beforebegin' | 'afterbegin' | 'beforeend' | 'afterend';

type ElementInsertOptions = {
  element: Element;
  insertPosition?: InsertPosition;
};

type ElementInsertOptionsList = ElementInsertOptions[];

type GetElement = Getter<Element>;
type GetElementInsertOptions = Getter<ElementInsertOptions>;

type CSUIOverlayAnchor = {
  element: Element;
  root?: Root;
  type: 'overlay';
  props?: Record<string, unknown>;
};

type CSUIInlineAnchor = {
  element: Element;
  type: 'inline';
  insertPosition?: InsertPosition;
  root?: Root;
  props?: Record<string, unknown>;
};

export type CSUIAnchor = CSUIOverlayAnchor | CSUIInlineAnchor;

export type CSUIProps = {
  anchor?: CSUIAnchor;
};

export type CSUIMountState = {
  document: Document;
  observer: MutationObserver | null;

  mountInterval: NodeJS.Timer | null;

  isMounting: boolean;
  isMutated: boolean;
  /**
   * Used to quickly check if element is already mounted
   */
  hostSet: Set<Element>;

  /**
   * Used to add more metadata to the host Set
   */
  hostMap: WeakMap<Element, CSUIAnchor>;

  /**
   * Used to align overlay anchor with elements on the page
   */
  overlayTargetList: Element[];
};

export type GetRootContainer = (
  props: {
    mountState?: CSUIMountState;
  } & CSUIProps,
) => Async<Element>;

export type GetOverlayAnchor = GetElement;
export type GetOverlayAnchorList = Getter<NodeList>;

export type GetInlineAnchor = GetElement | GetElementInsertOptions;
export type GetInlineAnchorList = Getter<NodeList | ElementInsertOptionsList>;

export type MountShadowHost = (
  props: {
    mountState?: CSUIMountState;
    shadowHost: Element;
  } & CSUIProps,
) => Async<void>;

export type GetShadowHostId = Getter<string, CSUIAnchor>;

export type GetStyle = Getter<HTMLStyleElement, CSUIAnchor & { sfcStyleContent?: string }>;

export type GetSfcStyleContent = Getter<string>;

/**
 * @return a cleanup unwatch function that will be run when unmounted
 */
export type WatchOverlayAnchor = (updatePosition: () => Promise<void>) => (() => void) | void;

export type CSUIContainerProps = {
  id?: string;
  children?: React.ReactNode;
  watchOverlayAnchor?: WatchOverlayAnchor;
} & CSUIProps;

export type CSUIJSXContainer = (p?: CSUIContainerProps) => React.JSX.Element;
export type CSUIHTMLContainer = (p?: CSUIContainerProps) => HTMLElement;

export type CreateShadowRoot = (shadowHost: HTMLElement) => Async<ShadowRoot>;

export type Render<T> = (
  props: {
    createRootContainer?: (p?: CSUIAnchor) => Async<Element>;
  } & CSUIProps,
  InlineCSUIContainer?: T,
  OverlayCSUIContainer?: T,
) => Async<void>;

export type CSUIWatch = (props: {
  render: (anchor: CSUIAnchor) => Async<void>;
  observer: {
    start: (render: (anchor?: CSUIAnchor) => void) => void;
    mountState: CSUIMountState;
  };
}) => void;

export type CSUI<T> = {
  default: React.ComponentType<CSUIProps>;
  getStyle: GetStyle;
  getSfcStyleContent: GetSfcStyleContent;
  getShadowHostId: GetShadowHostId;

  getOverlayAnchor: GetOverlayAnchor;
  getOverlayAnchorList: GetOverlayAnchorList;

  getInlineAnchor: GetInlineAnchor;
  getInlineAnchorList: GetInlineAnchorList;

  getRootContainer: GetRootContainer;

  createShadowRoot: CreateShadowRoot;
  watchOverlayAnchor: WatchOverlayAnchor;
  mountShadowHost: MountShadowHost;

  render: Render<T>;

  watch: CSUIWatch;
};
