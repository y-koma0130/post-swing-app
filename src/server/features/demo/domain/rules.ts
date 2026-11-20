import type { VIDEO_RULES } from '@/server/features/thread/domain/rules'
import type { VideoAngle } from '@/server/features/thread/domain/values/VideoAngle'

/**
 * デモのコーチ（staging で、コーチ候補に操作を試してもらう）のルール
 *
 * - 管理画面から1人ずつ作る。作るたびに、架空の生徒・ドリル・いろいろな状態のレッスンが入る
 * - デモ用のリンクを開くと、メールのコードなしでそのコーチとしてログインする
 * - 期限を過ぎたら、データごと消す（正式なコーチにはしない。採用したら本番で招待し直す）
 * - デモのあいだは、通知（LINE・メール）を送らず、Stripe も呼ばない
 */
export const DEMO_RULES = {
  /** 作ってから消すまでの日数 */
  lifetimeDays: 7,
  /** デモのコーチの名前（コーチ候補の名前）の長さ */
  nameMaxLength: 30,
  /** デモ用のリンクに入れるトークンの長さ（バイト） */
  tokenBytes: 32,
  /**
   * お手本の動画を置く場所（R2 のキーの先頭）。どのデモからも同じ動画を参照するので、
   * デモを消しても、毎日の動画の削除でも、ここは消さない
   */
  sampleKeyPrefix: 'demo/samples/',
} as const

/** お手本の動画（R2 に手で置いておく。置いていないと、動画が再生できないだけで、ほかは試せる） */
export const DEMO_SAMPLE_VIDEOS = {
  front: {
    r2Key: `${DEMO_RULES.sampleKeyPrefix}front.mp4`,
    contentType: 'video/mp4',
    angle: 'front',
  },
  back: {
    r2Key: `${DEMO_RULES.sampleKeyPrefix}back.mp4`,
    contentType: 'video/mp4',
    angle: 'back',
  },
} as const satisfies Record<
  string,
  Readonly<{
    r2Key: string
    /** 動画として受け取れる形式（VIDEO_RULES） */
    contentType: (typeof VIDEO_RULES.allowedContentTypes)[number]
    angle: VideoAngle
  }>
>

/** デモのアカウントのメールアドレスのドメイン（届かない。ログインにも使わない） */
export const DEMO_EMAIL_DOMAIN = 'demo.swingpost.invalid'
