import inlineCss from '../../../dist/all/index.css?inline';
import { InlineCSUIContainer } from '@repo/inline-anchors/lib/containers/react';
import { createAnchorObserver, createRender } from '@repo/inline-anchors/lib/csui';
import { getLayout } from '@repo/inline-anchors/lib/react';
import { App } from '@src/matches/all/App';
import { createRoot } from 'react-dom/client';
import type { CSUI, CSUIAnchor, CSUIJSXContainer, CSUIProps } from '@repo/inline-anchors';

const regex = /\/status\/(\d+)/;

// Inject styles into document so emoji picker (portaled to body) has styles above page UI
const FRENS_PAGE_STYLE_ID = 'frens-inline-reactions-page-styles';
if (!document.getElementById(FRENS_PAGE_STYLE_ID)) {
  const style = document.createElement('style');
  style.id = FRENS_PAGE_STYLE_ID;
  style.textContent = inlineCss;
  document.head.appendChild(style);
}

const root = document.createElement('div');
root.id = 'FRENS-x-all';
document.body.append(root);

const rootIntoShadow = document.createElement('div');
rootIntoShadow.id = `shadow-root-FRENS-x-all`;

const Mount = {
  default: App satisfies React.ComponentType<CSUIProps>,
  getInlineAnchorList: async () => {
    const anchors = document.querySelectorAll(`button[data-testid="like"], button[data-testid="unlike"]`);
    return Array.from(anchors)

      .map(anchor => {
        const article = anchor.closest('article');
        if (!article) return null;

        const linkElement = article?.querySelector('a[href*="/status/"]')?.getAttribute('href');

        console.log('[frens] linkElement', linkElement);

        const match = linkElement?.match(regex);
        const statusId = match?.[1];
        if (!statusId) return null;

        return {
          element: anchor.parentElement,
          type: 'inline',
          insertPosition: 'afterend',
          props: {
            statusId,
            article,
          },
        } as CSUIAnchor;
      })
      .filter(Boolean) as CSUIAnchor[];
  },
  getStyle: async () => {
    const style = document.createElement('style');
    style.innerHTML = inlineCss;
    return style;
  },
  getSfcStyleContent: async () => inlineCss,
} as unknown as CSUI<CSUIJSXContainer>;

const observer = createAnchorObserver(Mount);

const render = createRender(Mount, [InlineCSUIContainer], observer?.mountState, async (anchor, rootContainer) => {
  const root = createRoot(rootContainer);
  anchor.root = root;

  const Layout = getLayout(Mount);

  root.render(
    <Layout>
      <InlineCSUIContainer anchor={anchor}>
        <App />
      </InlineCSUIContainer>
    </Layout>,
  );
});

if (observer) {
  observer.start(render);

  if (typeof Mount.watch === 'function') {
    Mount.watch({
      observer,
      render,
    });
  }
}
