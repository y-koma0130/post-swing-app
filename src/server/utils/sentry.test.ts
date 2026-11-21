import { describe, expect, it } from 'vitest'
import { scrubEvent, sentryOptions } from './sentry'

describe('sentry', () => {
  it('DSN がなければ送らない（開発中）', () => {
    expect(sentryOptions({ APP_ENV: 'development' })).toBeUndefined()
    expect(sentryOptions({ SENTRY_DSN: '', APP_ENV: 'development' })).toBeUndefined()
  })

  it('送る前に、利用者とリクエストの中身を消し、URL のクエリも落とす', () => {
    const scrubbed = scrubEvent({
      type: undefined,
      user: { id: 'u1', email: 'someone@example.com' },
      request: {
        method: 'POST',
        url: 'https://swingpost.app/coach/login?token=secret#x',
        cookies: { session: 'abc' },
        headers: { authorization: 'Bearer x' },
        data: { email: 'someone@example.com' },
        query_string: 'token=secret',
      },
    })
    expect(scrubbed.user).toBeUndefined()
    expect(scrubbed.request).toEqual({ method: 'POST', url: 'https://swingpost.app/coach/login' })
  })
})
