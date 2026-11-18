import type { CoachAvailability } from '../values/CoachAvailability'

/**
 * 受付ページからの新規申し込みの扱い
 * - open: そのまま申し込める
 * - ack_required: 返信が遅れることを了承してから申し込める
 * - paused: いまは申し込めない（不在中）
 */
export type SignupGuard = 'open' | 'ack_required' | 'paused'

export type DecideSignupGuard = (availability: CoachAvailability) => SignupGuard

/**
 * ドメインルール:
 * - 不在中：申し込めない（申し込みはコーチが48時間以内に受けるか決めるため、不在中は受けられない）
 * - 返信遅れフラグ：了承が要る
 * - 通常：そのまま
 */
export const decideSignupGuard: DecideSignupGuard = (availability) => {
  switch (availability.kind) {
    case 'absent':
      return 'paused'
    case 'delayed':
      return 'ack_required'
    case 'available':
      return 'open'
  }
}
