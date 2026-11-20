import { quoteAnchorId, quoteLabel } from '@/app/utils/threadText'
import type { ChatQuote } from '@/server/features/thread/domain/values/ChatMessage'

/** 吹き出しの上に出す引用。押すと引用先へスクロールする */
export const QuotePreview = ({ quote }: { quote: ChatQuote }) => (
  <a
    href={`#${quoteAnchorId(quote.kind, quote.targetId)}`}
    className="border-mint text-caption text-muted hover:text-ink active:text-ink active:bg-mint-soft mb-1 block truncate border-l-2 pl-2 transition-colors"
  >
    {quoteLabel(quote)}
  </a>
)
