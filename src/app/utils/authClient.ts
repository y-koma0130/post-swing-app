import { createAuthClient } from 'better-auth/client'
import { emailOTPClient } from 'better-auth/client/plugins'

/** ブラウザから Better Auth の API（/api/auth）を呼ぶ */
export const authClient = createAuthClient({ plugins: [emailOTPClient()] })
