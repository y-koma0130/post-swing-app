import type { ChatQuote } from '@/server/features/thread/domain/values/ChatMessage'
import { quoteAnchorId, quoteLabel } from '../utils/threadText'

/** 吹き出しの上に出す引用。押すと引用先へスクロールする */
export const QuotePreview = ({ quote }: { quote: ChatQuote }) => (
  <a
    href={`#${quoteAnchorId(quote.kind, quote.targetId)}`}
    className="border-mint text-caption text-muted hover:text-ink mb-1 block truncate border-l-2 pl-2"
  >
    {quoteLabel(quote)}
  </a>
)
