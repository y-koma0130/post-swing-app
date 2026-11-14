import 'server-only'
import { z } from 'zod'
import { coachSchema } from '@/server/features/coach/domain/values/Coach'
import { threadSchema } from '@/server/features/thread/domain/values/Thread'

/**
 * MOC 用の固定データ。スキーマで parse して、ドメインのルールを満たすことを保証する
 * 段階1で D1 に置き換えたら削除する
 */

export const MOCK_COACH_SLUG = 'sample-pro'

export const mockCoaches = z.array(coachSchema).parse([
  {
    slug: MOCK_COACH_SLUG,
    name: '山田 太郎',
    title: 'ティーチングプロ',
    bio: 'インドアスクールで10年。トップの形とインパクトの再現性を、言葉と線で分かりやすく伝えます。',
    instagram: '@sample_golf_lesson',
    monthlyCapacity: 20,
    plans: [
      {
        kind: 'trial',
        name: 'お試し',
        price: 550,
        description: '動画1本のミニ添削（チャット3通）',
      },
      { kind: 'single', name: '1スレッド', price: 4980, description: '動画3本まで・30日間' },
      { kind: 'monthly', name: '月額', price: 3980, description: '毎月1スレッド' },
    ],
  },
])

export const mockThreads = z.array(threadSchema).parse([
  {
    id: 'th_001',
    coachSlug: MOCK_COACH_SLUG,
    studentName: '佐藤さん',
    theme: 'トップで右ひざが流れる',
    status: 'waiting_coach',
    startedAt: '2026-11-10T09:00:00+09:00',
    expiresAt: '2026-12-10T09:00:00+09:00',
    videos: [
      {
        id: 'v_001',
        uploadedAt: '2026-11-10T09:05:00+09:00',
        note: 'ドライバーでスライスします。トップで右ひざが伸びている気がします。',
        cards: [],
      },
    ],
    messages: [],
  },
  {
    id: 'th_002',
    coachSlug: MOCK_COACH_SLUG,
    studentName: '鈴木さん',
    theme: 'インパクトで手元が浮く',
    status: 'waiting_student',
    startedAt: '2026-11-01T20:00:00+09:00',
    expiresAt: '2026-12-01T20:00:00+09:00',
    videos: [
      {
        id: 'v_002',
        uploadedAt: '2026-11-01T20:10:00+09:00',
        note: '7番アイアンです。ダフりが多いです。',
        cards: [
          {
            id: 'rc_001',
            position: 'impact',
            timeSec: 1.42,
            annotations: [
              {
                kind: 'line',
                from: { x: 0.42, y: 0.35 },
                to: { x: 0.48, y: 0.62 },
                color: '#5FD4A0',
              },
            ],
            comment:
              'インパクトで手元がアドレスより拳1つ分高くなっています。左手首の角度を保ったまま振り抜きましょう。',
          },
        ],
      },
    ],
    messages: [
      {
        id: 'm_001',
        videoId: 'v_002',
        from: 'student',
        body: 'ありがとうございます！手元の高さ意識してみます。',
        sentAt: '2026-11-02T08:00:00+09:00',
      },
      {
        id: 'm_002',
        videoId: 'v_002',
        from: 'coach',
        body: '練習後にもう一度撮って送ってください。',
        sentAt: '2026-11-02T12:00:00+09:00',
      },
    ],
  },
])
