import '@src/Options.css';
import { t } from '@repo/i18n';
import { useStorage, withErrorBoundary, withSuspense } from '@repo/shared';
import { exampleThemeStorage } from '@repo/storage';
import { cn, ErrorDisplay, LoadingSpinner, ToggleButton } from '@repo/ui';

const Options = () => {
  const { isLight } = useStorage(exampleThemeStorage);

  return (
    <div className={cn('App', isLight ? 'bg-slate-50 text-gray-900' : 'bg-gray-800 text-gray-100')}>
      <p>
        Edit <code>pages/inline-reactions/src/Options.tsx</code>
      </p>
      <ToggleButton onClick={exampleThemeStorage.toggle}>{t('toggleTheme')}</ToggleButton>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Options, <LoadingSpinner />), ErrorDisplay);
