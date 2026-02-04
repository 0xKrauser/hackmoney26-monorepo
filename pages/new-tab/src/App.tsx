import LoginScreen from './components/LoginScreen';
import WalletScreen from './components/WalletScreen';
import { usePrivy } from '@privy-io/react-auth';
import { LoadingSpinner } from '@repo/ui';

const App = () => {
  const { ready, authenticated } = usePrivy();

  // Show loading while Privy initializes
  if (!ready) {
    return (
      <div className="app-loading">
        <LoadingSpinner />
        <span>Loading...</span>
      </div>
    );
  }

  // Not authenticated - show login
  if (!authenticated) {
    return <LoginScreen />;
  }

  // Authenticated - show wallet dashboard
  return <WalletScreen />;
};

export default App;
