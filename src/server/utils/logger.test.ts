import { captureException } from '@sentry/core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { logError, logInfo, logWarn, serializeError } from './logger'

vi.mock('@sentry/core', () => ({ captureException: vi.fn() }))

const lastLine = (spy: { mock: { calls: unknown[][] } }): unknown => {
  const line = spy.mock.calls.at(-1)?.[0]
  return typeof line === 'string' ? JSON.parse(line) : undefined
}

describe('logger', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.mocked(captureException).mockClear()
  })

  it('1行の JSON で出し、info・warn は Sentry に送らない', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    logInfo('thread', '終えました', { counts: { closed: 2 } })
    logWarn('notification', '再送します', { ids: { messageId: 'm1' } }, new Error('timeout'))
    expect(lastLine(info)).toEqual({
      level: 'info',
      scope: 'thread',
      message: '終えました',
      counts: { closed: 2 },
    })
    expect(lastLine(warn)).toMatchObject({
      level: 'warn',
      ids: { messageId: 'm1' },
      error: { name: 'Error', message: 'timeout' },
    })
    expect(captureException).not.toHaveBeenCalled()
  })

  it('error はログに出し、Sentry にも ID と種類を付けて送る', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const error = new Error('boom')
    logError('stripe', '処理に失敗しました', error, {
      ids: { eventId: 'evt_1' },
      kind: 'invoice.paid',
    })
    expect(lastLine(spy)).toMatchObject({
      level: 'error',
      scope: 'stripe',
      ids: { eventId: 'evt_1' },
      kind: 'invoice.paid',
      error: { message: 'boom' },
    })
    expect(captureException).toHaveBeenCalledWith(error, {
      tags: { scope: 'stripe', kind: 'invoice.paid' },
      extra: { message: '処理に失敗しました', eventId: 'evt_1' },
    })
  })

  it('例外は決めた項目だけを取り出す（Stripe のエラーは種類・コードも）', () => {
    const stripeLike = Object.assign(new Error('Your card was declined.'), {
      type: 'StripeCardError',
      code: 'card_declined',
      statusCode: 402,
      raw: { email: 'someone@example.com' },
    })
    const picked = serializeError(stripeLike)
    expect(picked).toMatchObject({
      name: 'Error',
      message: 'Your card was declined.',
      type: 'StripeCardError',
      code: 'card_declined',
      statusCode: '402',
    })
    expect(JSON.stringify(picked)).not.toContain('someone@example.com')
  })

  it('Error でない値は、中身を出さずに型だけを出す', () => {
    expect(serializeError({ email: 'someone@example.com' })).toEqual({
      name: 'NonError',
      message: 'object',
    })
  })
})
