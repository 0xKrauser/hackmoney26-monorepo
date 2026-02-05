import { useChain } from '../hooks/useChain';
import type { SupportedChain } from '@repo/storage';

const ChainSelector = () => {
  const { chain, setChain, config, loading } = useChain();

  if (loading) return null;

  const handleToggle = () => {
    const newChain: SupportedChain = chain === 'base' ? 'base-sepolia' : 'base';
    setChain(newChain);
  };

  return (
    <button
      className="chain-selector"
      onClick={handleToggle}
      title={`Switch to ${chain === 'base' ? 'Base Sepolia' : 'Base Mainnet'}`}>
      <div className={`chain-indicator ${chain === 'base' ? 'mainnet' : 'testnet'}`} />
      <span className="chain-name">{config.name}</span>
      <ChevronIcon />
    </button>
  );
};

const ChevronIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

export default ChainSelector;
