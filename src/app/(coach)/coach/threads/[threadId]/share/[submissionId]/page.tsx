import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { Notice } from '@/app/components/ui/Notice'
import { Page, PageHeader } from '@/app/components/ui/Page'
import { ShareImageBuilder } from '@/app/features/share-image/components/ShareImageBuilder'
import { studentLabel } from '@/app/features/share-image/utils/shareLayout'
import {
  cardTitle,
  cardVideoLabelOf,
  KEY_POSITION_LABEL,
  submissionLabel,
} from '@/app/utils/threadText'
import { getActor } from '@/server/auth/getActor'
import { getCurrentCoach } from '@/server/features/coach/presentation/queries'
import { getCoachThread } from '@/server/features/thread/presentation/queries'

export const metadata: Metadata = { title: 'シェア画像' }

type Props = {
  params: Promise<{ threadId: string; submissionId: string }>
}

/**
 * 返した添削から、インスタ用のシェア画像を作る（担当のコーチだけ）。
 * 生徒が公開を許可しているときだけ作れる。画像の処理はブラウザの中だけで行う
 */
const SharePage = async ({ params }: Props) => {
  const { threadId, submissionId } = await params
  if (!(await getActor())) redirect('/coach/login')
  const [thread, current] = await Promise.all([getCoachThread(threadId), getCurrentCoach()])
  if (!thread || current.kind !== 'coach') notFound()
  const index = thread.submissions.findIndex((s) => s.id === submissionId)
  const submission = thread.submissions[index]
  if (!submission?.reply) notFound()
  const consent = thread.shareConsent
  const back = { href: `/coach/threads/${thread.id}`, label: '添削に戻る' }

  if (!consent?.allowPublish) {
    return (
      <Page layout="form">
        <PageHeader back={back} title="シェア画像" />
        <Notice>
          <p>生徒が添削の公開を許可していないので、シェア画像は作れません。</p>
        </Notice>
      </Page>
    )
  }

  const labelOf = cardVideoLabelOf(submission.videos)
  return (
    <Page layout="form">
      <PageHeader
        back={back}
        eyebrow={`${submissionLabel(index)}の添削`}
        title="シェア画像を作る"
        description="インスタのフィード（カルーセル）とストーリーズ用の画像を作ります。名前は出しません"
      />
      <ShareImageBuilder
        cards={submission.reply.cards.map((card, i) => ({
          id: card.id,
          imageUrl: card.imageUrl,
          title: cardTitle(card, i, labelOf),
          positionLabel: KEY_POSITION_LABEL[card.position],
          comment: card.comment,
        }))}
        theme={thread.theme}
        drillTitles={submission.reply.drills.map((d) => d.title)}
        studentLabel={studentLabel(thread.golfProfile, consent)}
        showFaceAllowed={consent.showFace}
        account={current.settings.instagram.trim() || current.settings.name}
      />
    </Page>
  )
}

export default SharePage
