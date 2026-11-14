/**
 * スレッドのルール（暫定）。計画書「5. サービスの仕組み」より
 */
export const THREAD_RULES = {
  maxVideosPerThread: 3,
  maxStudentMessagesPerVideo: 3,
  durationDays: 30,
} as const
