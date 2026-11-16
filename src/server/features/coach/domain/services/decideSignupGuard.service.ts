import type { CoachAvailability } from '../values/CoachAvailability'

/**
 * 受付ページからの新規申し込みの扱い
 * - open: そのまま申し込める
 * - ack_required: 返信が遅れることを了承してから申し込める
 * - paused: いまは申し込めない（不在中で、コーチが新規を止めている）
 */
export type SignupGuard = 'open' | 'ack_required' | 'paused'

export type DecideSignupGuard = (availability: CoachAvailability) => SignupGuard

/**
 * ドメインルール:
 * - 不在中：コーチが新規を止めていれば申し込めない。止めていなければ了承が要る
 * - 返信遅れフラグ：了承が要る
 * - 通常：そのまま
 */
export const decideSignupGuard: DecideSignupGuard = (availability) => {
  switch (availability.kind) {
    case 'absent':
      return availability.absence.pauseNewSignups ? 'paused' : 'ack_required'
    case 'delayed':
      return 'ack_required'
    case 'available':
      return 'open'
  }
}
