import type { RetakeRequest } from '../../domain/values/RetakeRequest'
import type { Thread } from '../../domain/values/Thread'
import { threadIdSchema } from '../../domain/values/ThreadId'

/** 撮り直しのテストで使うスレッド（コーチの添削を待っている提出が1つ） */
export const retakeThread = (overrides: Partial<Thread> = {}): Thread => ({
  id: threadIdSchema.parse('thread-1'),
  coachUserId: 'coach-1',
  studentUserId: 'student-1',
  planKind: 'single',
  theme: 'トップで右ひざが流れる',
  status: 'waiting_coach',
  startedAt: new Date('2026-11-01T00:00:00Z'),
  expiresAt: new Date('2026-12-01T00:00:00Z'),
  closedAt: null,
  requestedAt: null,
  submissions: [
    {
      id: 'sub-1',
      submittedAt: new Date('2026-11-10T00:00:00Z'),
      note: '',
      videos: [{ id: 'v-1', angle: 'front' }],
      replied: false,
    },
  ],
  messages: [],
  ...overrides,
})

export const openRetake = (overrides: Partial<RetakeRequest> = {}): RetakeRequest => ({
  id: 'req-1',
  submissionId: 'sub-1',
  reason: 'framing',
  message: '',
  requestedAt: new Date('2026-11-11T00:00:00Z'),
  closedAt: null,
  closeReason: null,
  ...overrides,
})
