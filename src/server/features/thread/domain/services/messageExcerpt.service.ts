import type { ChatAttachment } from '../values/ChatMessage'

/** 引用に写す本文の長さ */
const EXCERPT_LENGTH = 40

export type MessageExcerpt = (
  message: Readonly<{
    body: string
    attachmentKind: ChatAttachment['kind']
    /** ドリルを添えたときのドリルの名前 */
    drillTitle: string | null
  }>
) => string

/** メッセージを引用するときに見せる冒頭（本文のない添付だけのメッセージなら、添付の種類） */
export const messageExcerpt: MessageExcerpt = ({ body, attachmentKind, drillTitle }) => {
  const trimmed = body.trim()
  if (trimmed !== '') return trimmed.slice(0, EXCERPT_LENGTH)
  switch (attachmentKind) {
    case 'drill':
      return `ドリル：${drillTitle ?? ''}`
    case 'video':
    case 'none':
      return '動画'
  }
}
