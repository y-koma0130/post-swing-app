import 'server-only'
import { resolveLineRecipient } from '../application/usecases/resolveLineRecipient.usecase'
import { fetchLineFriendship } from '../infrastructure/external-services/fetchLineFriendship'
import {
  findLineRecipient,
  saveLineFriend,
} from '../infrastructure/repositories/notificationRepository'

/** 通知の相手と友だち状態（記録がなければ LINE に問い合わせる） */
export const findLineRecipientWithFriendship = (userId: string) =>
  resolveLineRecipient({ userId }, { findLineRecipient, fetchLineFriendship, saveLineFriend })
