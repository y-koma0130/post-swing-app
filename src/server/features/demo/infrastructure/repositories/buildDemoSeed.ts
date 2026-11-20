import type {
  chatMessage,
  coachProfile,
  coachReview,
  drill,
  monitorCode,
  plan,
  purchase,
  reply,
  replyDrill,
  shareConsent,
  studentChart,
  studentChartEntry,
  submission,
  thread,
  threadRead,
  user,
  video,
} from '@/server/db/schema'
import { COACH_RULES, DEFAULT_PLANS } from '@/server/features/coach/domain/rules'
import type { PlanKind } from '@/server/features/coach/domain/values/Plan'
import { MONITOR_RULES } from '@/server/features/monitor/domain/rules'
import { calcSystemFee } from '@/server/features/purchase/domain/services/calcSystemFee.service'
import { SHARE_RULES } from '@/server/features/share/domain/rules'
import { THREAD_RULES } from '@/server/features/thread/domain/rules'
import { DEMO_EMAIL_DOMAIN, DEMO_SAMPLE_VIDEOS } from '../../domain/rules'

type Insert<T extends { $inferInsert: unknown }> = T['$inferInsert']

/** デモを作るときに書く行（テーブルごと。外部キーの順に入れる） */
export type DemoSeed = {
  users: Insert<typeof user>[]
  coach: Insert<typeof coachProfile>
  plans: Insert<typeof plan>[]
  drills: Insert<typeof drill>[]
  monitorCodes: Insert<typeof monitorCode>[]
  purchases: Insert<typeof purchase>[]
  threads: Insert<typeof thread>[]
  submissions: Insert<typeof submission>[]
  videos: Insert<typeof video>[]
  replies: Insert<typeof reply>[]
  replyDrills: Insert<typeof replyDrill>[]
  chatMessages: Insert<typeof chatMessage>[]
  reviews: Insert<typeof coachReview>[]
  charts: Insert<typeof studentChart>[]
  chartEntries: Insert<typeof studentChartEntry>[]
  shareConsents: Insert<typeof shareConsent>[]
  reads: Insert<typeof threadRead>[]
}

export type BuildDemoSeedInput = Readonly<{
  coachUserId: string
  coachName: string
  slug: string
  tokenHash: string
  expiresAt: Date
  now: Date
  newId: () => string
  /** プロモーションコードの文字（MONITOR_RULES の文字だけ） */
  monitorCode: string
}>

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

const DEMO_DRILLS = [
  {
    title: '右ひざキープの素振り',
    description:
      '右ひざの角度を変えずに、トップまでゆっくり上げる素振りを10回。鏡の前で確かめましょう。',
  },
  {
    title: 'タオルのハーフスイング',
    description:
      '両脇にタオルをはさみ、落とさないように腰から腰の振り幅で打ちます。腕と体の一体感をつかむ練習です。',
  },
  {
    title: '片手打ち（左手）',
    description:
      '左手だけで短く持ち、7番アイアンで30ヤードを打ちます。リードする手の使い方を覚えます。',
  },
] as const

/**
 * デモのコーチと、最初から入れておくデータ（架空の生徒・ドリル・いろいろな状態のレッスン）。
 * 承認待ち・添削待ち（2件）・レッスン中（チャットの未読あり）・完了（2件）・お断り をそろえる。
 * 動画はお手本の動画（DEMO_SAMPLE_VIDEOS）を参照する
 */
export const buildDemoSeed = (input: BuildDemoSeedInput): DemoSeed => {
  const { coachUserId, now, newId } = input
  const at = (offsetMs: number) => new Date(now.getTime() + offsetMs)
  const seed: DemoSeed = {
    users: [],
    coach: {
      userId: coachUserId,
      slug: input.slug,
      displayName: input.coachName,
      title: 'ゴルフインストラクター（デモ）',
      bio: 'これはデモ用のプロフィールです。設定画面から、名前や紹介文、価格を自由に変えて試せます。',
      monthlyCapacity: COACH_RULES.defaultMonthlyCapacity,
      demoExpiresAt: input.expiresAt,
      demoTokenHash: input.tokenHash,
      createdAt: now,
      updatedAt: now,
    },
    plans: DEFAULT_PLANS.map((p) => ({
      id: newId(),
      coachUserId,
      kind: p.kind,
      name: p.name,
      priceYen: p.price,
      description: '',
      active: p.active,
      createdAt: now,
      updatedAt: now,
    })),
    drills: [],
    monitorCodes: [
      {
        id: newId(),
        coachUserId,
        code: input.monitorCode,
        label: 'インスタ募集（デモ）',
        priceYen: 0,
        maxUses: 3,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ],
    purchases: [],
    threads: [],
    submissions: [],
    videos: [],
    replies: [],
    replyDrills: [],
    chatMessages: [],
    reviews: [],
    charts: [],
    chartEntries: [],
    shareConsents: [],
    reads: [],
  }

  seed.users.push({
    id: coachUserId,
    name: input.coachName,
    email: `coach-${coachUserId}@${DEMO_EMAIL_DOMAIN}`,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  })

  const drillIds = DEMO_DRILLS.map((d) => {
    const id = newId()
    seed.drills.push({ id, coachUserId, ...d, createdAt: now, updatedAt: now })
    return id
  })

  // 初めのプランは種類ごとに1つずつある（なければ0円にする。0円は無料のモニターと同じ扱い）
  const priceOf = (kind: PlanKind): number => DEFAULT_PLANS.find((p) => p.kind === kind)?.price ?? 0

  const addStudent = (name: string) => {
    const id = newId()
    seed.users.push({
      id,
      name,
      email: `student-${id}@${DEMO_EMAIL_DOMAIN}`,
      emailVerified: true,
      createdAt: at(-60 * DAY),
      updatedAt: now,
    })
    return id
  }

  type LessonInput = {
    studentUserId: string
    planKind: PlanKind
    status: Insert<typeof thread>['status']
    purchaseStatus: Insert<typeof purchase>['status']
    theme: string
    startedAt: Date
    requestedAt: Date
    decidedAt?: Date
    closedAt?: Date
    profile?: Pick<Insert<typeof thread>, 'ageRange' | 'roundFrequency' | 'averageScore'>
    decline?: Pick<Insert<typeof thread>, 'declineReason' | 'declineMessage'>
  }
  const addLesson = (l: LessonInput) => {
    const priceYen = priceOf(l.planKind)
    const purchaseId = newId()
    seed.purchases.push({
      id: purchaseId,
      studentUserId: l.studentUserId,
      coachUserId,
      planKind: l.planKind,
      priceYen,
      systemFeeYen: calcSystemFee(priceYen),
      status: l.purchaseStatus,
      createdAt: l.requestedAt,
      updatedAt: now,
    })
    const threadId = newId()
    seed.threads.push({
      id: threadId,
      coachUserId,
      studentUserId: l.studentUserId,
      purchaseId,
      planKind: l.planKind,
      theme: l.theme,
      ageRange: l.profile?.ageRange ?? '40s',
      roundFrequency: l.profile?.roundFrequency ?? 'monthly',
      averageScore: l.profile?.averageScore ?? 100,
      status: l.status,
      startedAt: l.startedAt,
      expiresAt: new Date(l.startedAt.getTime() + THREAD_RULES.durationDays * DAY),
      closedAt: l.closedAt ?? null,
      requestedAt: l.requestedAt,
      decidedAt: l.decidedAt ?? null,
      declineReason: l.decline?.declineReason ?? null,
      declineMessage: l.decline?.declineMessage ?? null,
      createdAt: l.requestedAt,
      updatedAt: now,
    })
    return { threadId, studentUserId: l.studentUserId }
  }

  const addSubmission = (
    lesson: { threadId: string; studentUserId: string },
    submittedAt: Date,
    note: string,
    angles: ReadonlyArray<keyof typeof DEMO_SAMPLE_VIDEOS> = ['front']
  ) => {
    const id = newId()
    seed.submissions.push({ id, threadId: lesson.threadId, note, submittedAt })
    for (const angle of angles) {
      const sample = DEMO_SAMPLE_VIDEOS[angle]
      seed.videos.push({
        id: newId(),
        threadId: lesson.threadId,
        submissionId: id,
        uploaderUserId: lesson.studentUserId,
        angle: sample.angle,
        r2Key: sample.r2Key,
        contentType: sample.contentType,
        sizeBytes: 0,
        uploadedAt: submittedAt,
      })
    }
    return id
  }

  const addReply = (
    submissionId: string,
    sentAt: Date,
    comment: string,
    drillIndex: number | null = null
  ) => {
    const replyId = newId()
    seed.replies.push({ id: replyId, submissionId, comment, sentAt })
    const d = drillIndex === null ? undefined : DEMO_DRILLS[drillIndex]
    const drillId = drillIndex === null ? undefined : drillIds[drillIndex]
    if (d && drillId) {
      seed.replyDrills.push({
        replyId,
        sortOrder: 0,
        drillId,
        title: d.title,
        description: d.description,
      })
    }
  }

  const addChat = (
    lesson: { threadId: string; studentUserId: string },
    role: 'coach' | 'student',
    body: string,
    sentAt: Date
  ) => {
    seed.chatMessages.push({
      id: newId(),
      threadId: lesson.threadId,
      senderRole: role,
      senderUserId: role === 'coach' ? coachUserId : lesson.studentUserId,
      body,
      sentAt,
    })
  }

  const markRead = (threadId: string, userId: string, lastReadAt: Date) => {
    seed.reads.push({ threadId, userId, lastReadAt })
  }

  const addChart = (
    studentUserId: string,
    tags: string[],
    memo: string,
    entries: string[] = []
  ) => {
    seed.charts.push({ coachUserId, studentUserId, tags, memo, updatedAt: now })
    entries.forEach((body, i) => {
      seed.chartEntries.push({
        id: newId(),
        coachUserId,
        studentUserId,
        body,
        createdAt: at(-(entries.length - i) * DAY),
      })
    })
  }

  // 承認待ちの申し込み（悩みと動画を見て、受けるか決める）
  const sato = addStudent('佐藤 健太')
  const requested = addLesson({
    studentUserId: sato,
    planKind: 'single',
    status: 'requested',
    purchaseStatus: 'authorized',
    theme: 'ドライバーが右に飛んでしまう',
    startedAt: at(-5 * HOUR),
    requestedAt: at(-5 * HOUR),
    profile: { ageRange: '40s', roundFrequency: 'monthly', averageScore: 105 },
  })
  addSubmission(requested, at(-5 * HOUR), 'ドライバーだけ右に出ます。アイアンはまっすぐです。')

  // 添削待ち（返事の目安が近い）。正面と後方の2本
  const suzuki = addStudent('鈴木 美穂')
  const dueSoon = addLesson({
    studentUserId: suzuki,
    planKind: 'single',
    status: 'waiting_coach',
    purchaseStatus: 'paid',
    theme: 'トップで右ひざが流れる',
    startedAt: at(-40 * HOUR),
    requestedAt: at(-43 * HOUR),
    decidedAt: at(-40 * HOUR),
    profile: { ageRange: '30s', roundFrequency: 'few_per_year', averageScore: 118 },
  })
  addSubmission(dueSoon, at(-43 * HOUR), '正面と後方から撮りました。', ['front', 'back'])
  addChart(suzuki, ['スライス', '初心者'], 'ゴルフ歴2年。右ひざが流れてスライスが出やすい。')
  seed.shareConsents.push({
    coachUserId,
    studentUserId: suzuki,
    allowPublish: true,
    showFace: false,
    showAgeRange: true,
    showScore: true,
    textVersion: SHARE_RULES.consentTextVersion,
    updatedAt: at(-43 * HOUR),
  })

  // 添削待ち（月額・2回目の提出）。1回目は添削ずみ
  const takahashi = addStudent('高橋 大輔')
  const monthly = addLesson({
    studentUserId: takahashi,
    planKind: 'monthly',
    status: 'waiting_coach',
    purchaseStatus: 'paid',
    theme: 'アプローチでダフる',
    startedAt: at(-10 * DAY),
    requestedAt: at(-10 * DAY - 2 * HOUR),
    decidedAt: at(-10 * DAY),
    profile: { ageRange: '50s', roundFrequency: 'two_to_three_per_month', averageScore: 95 },
  })
  const firstMonthly = addSubmission(
    monthly,
    at(-10 * DAY - 2 * HOUR),
    '30ヤードのアプローチです。'
  )
  addReply(
    firstMonthly,
    at(-9 * DAY),
    '手首が早くほどけてダフっています。左手首の角度を保ったまま振る練習をしましょう。',
    2
  )
  addChat(
    monthly,
    'student',
    'ありがとうございます！片手打ちやってみます。',
    at(-9 * DAY + 3 * HOUR)
  )
  addSubmission(monthly, at(-6 * HOUR), '1週間練習しました。前より当たるようになった気がします。')
  addChart(takahashi, ['月額', '90切り目標'], 'アプローチの手首のほどけが課題。', [
    '1回目：左手首の角度を保つ片手打ちを宿題にした',
  ])

  // レッスン中（添削を返したあと、生徒からチャットが届いている＝コーチの未読）
  const tanaka = addStudent('田中 由美')
  const chatting = addLesson({
    studentUserId: tanaka,
    planKind: 'single',
    status: 'waiting_student',
    purchaseStatus: 'paid',
    theme: 'アイアンが薄く当たる',
    startedAt: at(-6 * DAY),
    requestedAt: at(-6 * DAY - 3 * HOUR),
    decidedAt: at(-6 * DAY),
    profile: { ageRange: '60s', roundFrequency: 'weekly', averageScore: 102 },
  })
  const tanakaFirst = addSubmission(chatting, at(-6 * DAY - 3 * HOUR), '7番アイアンです。')
  addReply(
    tanakaFirst,
    at(-5 * DAY),
    '体が起き上がってボールの頭を打っています。前傾を保つために、タオルのハーフスイングから始めましょう。',
    1
  )
  addChat(chatting, 'coach', '動画ありがとうございました。添削を送りました。', at(-5 * DAY))
  addChat(
    chatting,
    'student',
    'ドリルをやってみたら、少し厚く当たるようになりました。次は後方からも撮った方がいいですか？',
    at(-3 * HOUR)
  )
  markRead(chatting.threadId, coachUserId, at(-4 * DAY))
  addChart(tanaka, ['アイアン'], '週1でラウンド。前傾の起き上がりが課題。')

  // 完了（レビューにコーチが返信ずみ）
  const ito = addStudent('伊藤 翔')
  const doneOld = addLesson({
    studentUserId: ito,
    planKind: 'single',
    status: 'closed',
    purchaseStatus: 'paid',
    theme: 'バンカーから出ない',
    startedAt: at(-45 * DAY),
    requestedAt: at(-45 * DAY - 2 * HOUR),
    decidedAt: at(-45 * DAY),
    closedAt: at(-15 * DAY),
  })
  const itoFirst = addSubmission(doneOld, at(-45 * DAY - 2 * HOUR), 'バンカーショットです。')
  addReply(itoFirst, at(-44 * DAY), 'フェースを開いて、ボールの手前の砂を打ちましょう。')
  seed.reviews.push({
    id: newId(),
    threadId: doneOld.threadId,
    coachUserId,
    studentUserId: ito,
    rating: 5,
    comment: 'バンカーが怖くなくなりました。説明がわかりやすかったです。',
    coachReply: 'ありがとうございます！また気になるところがあれば送ってください。',
    createdAt: at(-14 * DAY),
    repliedAt: at(-13 * DAY),
  })
  markRead(doneOld.threadId, coachUserId, at(-15 * DAY))
  addChart(ito, ['リピーター'], 'バンカーは克服。次はパター。')

  // 完了（お試し。レビューにまだ返信していない＝返信を試せる）
  const doneTrial = addLesson({
    studentUserId: ito,
    planKind: 'trial',
    status: 'closed',
    purchaseStatus: 'paid',
    theme: 'グリップの握り方',
    startedAt: at(-12 * DAY),
    requestedAt: at(-12 * DAY - HOUR),
    decidedAt: at(-12 * DAY),
    closedAt: at(-2 * DAY),
  })
  const itoTrial = addSubmission(doneTrial, at(-12 * DAY - HOUR), 'グリップを見てください。')
  addReply(itoTrial, at(-11 * DAY), '右手が上から握りすぎています。少し下から握りましょう。')
  seed.reviews.push({
    id: newId(),
    threadId: doneTrial.threadId,
    coachUserId,
    studentUserId: ito,
    rating: 4,
    comment: 'お試しでも丁寧でした。',
    createdAt: at(-DAY),
  })
  markRead(doneTrial.threadId, coachUserId, at(-2 * DAY))

  // お断り（専門外）
  const watanabe = addStudent('渡辺 誠')
  const declined = addLesson({
    studentUserId: watanabe,
    planKind: 'single',
    status: 'declined',
    purchaseStatus: 'voided',
    theme: 'パターの距離感',
    startedAt: at(-4 * DAY),
    requestedAt: at(-4 * DAY),
    decidedAt: at(-3 * DAY),
    decline: {
      declineReason: 'out_of_scope',
      declineMessage: 'パターの添削は専門外のため、お受けできませんでした。',
    },
  })
  addSubmission(declined, at(-4 * DAY), 'ロングパットが合いません。')
  markRead(declined.threadId, coachUserId, at(-3 * DAY))

  return seed
}

/** プロモーションコードの文字列（MONITOR_RULES の文字から、決まった長さで作る） */
export const randomMonitorCode = (randomIndex: (max: number) => number): string =>
  Array.from({ length: MONITOR_RULES.codeLength }, () =>
    MONITOR_RULES.codeAlphabet.charAt(randomIndex(MONITOR_RULES.codeAlphabet.length))
  ).join('')
