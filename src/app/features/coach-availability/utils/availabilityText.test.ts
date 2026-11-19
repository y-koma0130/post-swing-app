import { describe, expect, it } from 'vitest'
import {
  absenceNoticeMessage,
  absencePreview,
  absentMessage,
  availabilityBanner,
  chatReplyHint,
  confirmSendMessage,
  extensionNote,
  formatShortDate,
  nextDate,
  pausedMessage,
  replyTargetAfterApprovalMessage,
  replyTargetMessage,
  sendConfirmMessage,
  signupAckLabel,
  upcomingMessage,
} from './availabilityText'

const absence = { endDate: '2026-11-23', resumeDate: '2026-11-24', note: '' }

describe('availabilityText', () => {
  it('日付は「11/24」の形。月末・年末の翌日も出せる', () => {
    expect(formatShortDate('2026-01-05')).toBe('1/5')
    expect(nextDate('2026-11-30')).toBe('2026-12-01')
    expect(nextDate('2026-12-31')).toBe('2027-01-01')
  })

  it('不在の帯。一言があれば添える', () => {
    expect(absentMessage('山田', absence)).toBe(
      '山田コーチは11/23まで不在です。返信は11/24以降になります'
    )
    expect(absentMessage('山田', { ...absence, note: '試合のため' })).toBe(
      '山田コーチは11/23まで不在です。返信は11/24以降になります（試合のため）'
    )
  })

  it('確認ダイアログ：動画は「添削」、チャットは「返信」。遅れフラグは期間なし', () => {
    const absent = { kind: 'absent' as const, endDate: '2026-11-23', resumeDate: '2026-11-24' }
    expect(confirmSendMessage('video', '山田', absent)).toBe(
      '山田コーチは11/23まで不在です。添削は11/24以降になります。送りますか？'
    )
    expect(confirmSendMessage('chat', '山田', absent)).toBe(
      '山田コーチは11/23まで不在です。返信は11/24以降になります。送りますか？'
    )
    expect(confirmSendMessage('video', '山田', { kind: 'delayed' })).toBe(
      '山田コーチは現在、返信が遅れる場合があります。送りますか？'
    )
  })

  it('受付ページ・了承・システムメッセージ・プレビュー・延長', () => {
    expect(upcomingMessage({ startDate: '2026-11-20', endDate: '2026-11-23' })).toBe(
      '11/20〜11/23は不在の予定です'
    )
    expect(pausedMessage('2026-11-24')).toBe('11/24から受付を再開します')
    expect(signupAckLabel('2026-11-24')).toBe('返信が11/24以降になることを了承しました')
    expect(signupAckLabel(null)).toBe('返信が遅れる場合があることを了承しました')
    expect(absenceNoticeMessage('山田', '2026-11-23')).toBe(
      '山田コーチは11/23まで不在です。戻り次第返信します'
    )
    expect(absencePreview('山田', { startDate: '2026-11-20', endDate: '2026-11-23' })).toBe(
      '生徒には「山田コーチは11/20〜11/23不在です。返信は11/24以降になります」と表示されます'
    )
    expect(extensionNote(4)).toBe('（不在のため4日延長）')
    expect(extensionNote(0)).toBe('')
  })
})

describe('スレッドの表示', () => {
  const absent = {
    kind: 'absent' as const,
    endDate: '2026-11-23',
    resumeDate: '2026-11-24',
    note: '',
  }
  const available = { kind: 'available' as const, replyTargetHours: 48 }

  it('帯は不在・返信遅れのときだけ', () => {
    expect(availabilityBanner('山田', absent)).toBe(
      '山田コーチは11/23まで不在です。返信は11/24以降になります'
    )
    expect(availabilityBanner('山田', { kind: 'delayed' })).toBe('現在、返信が遅れる場合があります')
    expect(availabilityBanner('山田', available)).toBeNull()
  })

  it('チャットの入力欄の上：不在なら不在、ほかは返信の目安', () => {
    expect(chatReplyHint('山田', absent)).toBe('山田コーチは11/23まで不在です')
    expect(chatReplyHint('山田', { kind: 'delayed' })).toBe('返信の目安：1〜2日')
  })

  it('確認の文言は、通常のときは出さない', () => {
    expect(sendConfirmMessage('video', '山田', available)).toBeNull()
    expect(sendConfirmMessage('chat', '山田', absent)).toMatch(/送りますか？$/)
  })
})

describe('返信の目安', () => {
  it('申し込み（承認待ち）では、承認後からの目安と書く', () => {
    expect(replyTargetMessage(48)).toBe('通常48時間以内に添削が届きます')
    expect(replyTargetAfterApprovalMessage(48)).toBe(
      'コーチの承認後、通常48時間以内に添削が届きます'
    )
  })
})
