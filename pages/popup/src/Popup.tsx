import '@src/Popup.css';
import { TwitterVerification } from './TwitterVerification';
import { useStorage, withErrorBoundary, withSuspense } from '@repo/shared';
import { exampleThemeStorage } from '@repo/storage';
import { cn, ErrorDisplay, LoadingSpinner, ToggleButton } from '@repo/ui';

const Popup = () => {
  const { isLight } = useStorage(exampleThemeStorage);

  return (
    <div className={cn('App', isLight ? 'bg-slate-50' : 'bg-gray-800')}>
      <div className={cn('App-header', isLight ? 'text-gray-900' : 'text-gray-100')}>
        <TwitterVerification isLight={isLight} />
        <div className="mt-3 flex w-full justify-center">
          <ToggleButton>Toggle Theme</ToggleButton>
        </div>
      </div>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Popup, <LoadingSpinner />), ErrorDisplay);
