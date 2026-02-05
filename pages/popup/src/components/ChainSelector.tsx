import { ChevronDownIcon } from './icons';
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
      type="button"
      onClick={handleToggle}
      title={`Switch to ${chain === 'base' ? 'Base Sepolia' : 'Base Mainnet'}`}
      className="flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50">
      <span>{config.name}</span>
      <ChevronDownIcon className="h-3 w-3" />
    </button>
  );
};

export default ChainSelector;
