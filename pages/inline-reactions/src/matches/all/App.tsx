import { EmojiPicker } from '@repo/emoji-picker';
import { Avatar, AvatarFallback, AvatarImage } from '@src/components/ui/avatar';

export const App = () => {
  // Portal to document.body so picker is above fixed/sticky page UI (reply bar, toasts)
  const container = undefined;

  return (
    <div className="group relative inline-block h-full">
      <EmojiPicker container={container} className="min-h-full">
        <button className="flex h-full items-center gap-2">
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
          <span className="text-[13px]">55</span>
        </button>
      </EmojiPicker>
    </div>
  );
};
