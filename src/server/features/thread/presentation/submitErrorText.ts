import type { SubmitSubmissionError } from '../application/usecases/submitSubmission.usecase'

/**
 * 提出できなかった理由の言い方。Server Action と、動画を上げる前に確かめる生徒の画面（SubmissionForm）で使う
 */
export const SUBMIT_ERROR_TEXT = {
  not_found: '提出できませんでした',
  closed: 'このレッスンは終了しています',
  expired: 'このレッスンは期限が切れています',
  awaiting_reply: 'コーチの添削が届いてから、次を提出できます',
  submission_limit: 'このレッスンで提出できる回数に達しています',
  no_videos: '動画を選んでください',
  too_many_videos: '1回に送れる動画は2本までです',
  invalid_video: '動画をもう一度選び直してください',
  theme_required: '直したいところを書いてください',
  note_too_long: 'メモは1000文字までです',
  invalid_golf_profile: '平均スコアは50〜200の数字で入れてください',
  age_required: '年代を選んでください',
  not_adult: '18歳未満の方は、公開を許可できません（公開しない、を選んでください）',
  monitor_locked:
    'このコーチにはモニターで申し込んだため、公開をやめることはできません。やめたいときは、運営にメールでお問い合わせください',
} as const satisfies Record<SubmitSubmissionError, string>
