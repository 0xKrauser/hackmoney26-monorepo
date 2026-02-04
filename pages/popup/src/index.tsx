import '@src/index.css';
import '@src/Popup.css';
import { PrivyProvider } from './providers/PrivyProvider';
import { ToastProvider } from './providers/ToastProvider';
import App from '@src/App';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';

const queryClient = new QueryClient();

const init = () => {
  const appContainer = document.querySelector('#app-container');
  if (!appContainer) {
    throw new Error('Can not find #app-container');
  }
  const root = createRoot(appContainer);

  root.render(
    <QueryClientProvider client={queryClient}>
      <PrivyProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </PrivyProvider>
    </QueryClientProvider>,
  );
};

init();
