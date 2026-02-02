import { EmojiPicker } from '@repo/emoji-picker';
import { Avatar, AvatarFallback, AvatarImage } from '@src/components/ui/avatar';
import { useReactionPayment } from '@src/hooks/useReactionPayment';
import { useCallback } from 'react';
import type { EmojiType } from '@repo/emoji-picker';
import type { CSUIAnchor } from '@repo/inline-anchors';

interface AppProps {
  anchor?: CSUIAnchor;
  rootContainer?: Element;
}

export const App = ({ anchor }: AppProps) => {
  const postId = anchor?.props?.statusId as string | undefined;
  const { sendReaction, isConnected, isLoading, balance, openWalletPanel } = useReactionPayment();

  // Portal to document.body so picker is above fixed/sticky page UI (reply bar, toasts)
  const container = undefined;

  const handleEmojiClick = useCallback(
    async (emoji: EmojiType) => {
      if (!postId) {
        console.warn('[frens] No postId available for reaction');
        return;
      }

      if (!isConnected) {
        // Open side panel to connect wallet
        openWalletPanel('CONNECT');
        return;
      }

      try {
        await sendReaction({ postId, emoji });
      } catch (error) {
        // Error already logged in hook
        if (error instanceof Error && error.message.includes('Insufficient')) {
          openWalletPanel('DEPOSIT');
        }
      }
    },
    [postId, isConnected, sendReaction, openWalletPanel],
  );

  return (
    <div className="group relative inline-block h-full">
      <EmojiPicker container={container} className="min-h-full" onEmojiClick={handleEmojiClick}>
        <button className="flex h-full items-center gap-2" disabled={isLoading}>
          <div className="flex -space-x-2">
            <Avatar className="size-6 border-2 border-gray-800">
              <AvatarImage src="https://github.com/shadcn.png" alt="User 1" />
              <AvatarFallback className="text-xs">U1</AvatarFallback>
            </Avatar>
            <Avatar className="size-6 border-2 border-gray-800">
              <AvatarImage src="https://github.com/vercel.png" alt="User 2" />
              <AvatarFallback className="text-xs">U2</AvatarFallback>
            </Avatar>
            <Avatar className="size-6 border-2 border-gray-800">
              <AvatarImage src="https://github.com/liveblocks.png" alt="User 3" />
              <AvatarFallback className="text-xs">U3</AvatarFallback>
            </Avatar>
          </div>
          <span className="text-[13px]">
            {isConnected && balance > 0n ? `${(Number(balance) / 1e6).toFixed(2)}` : '55'}
          </span>
        </button>
      </EmojiPicker>
    </div>
  );
};
