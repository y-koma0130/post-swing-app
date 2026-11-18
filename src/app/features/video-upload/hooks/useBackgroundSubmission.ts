import { useSyncExternalStore } from 'react'
import {
  type BackgroundSubmissionState,
  getBackgroundSubmission,
  getServerBackgroundSubmission,
  subscribeBackgroundSubmission,
} from '../utils/backgroundSubmission'

/** 画面の外で進めている提出の状態 */
export const useBackgroundSubmission = (): BackgroundSubmissionState =>
  useSyncExternalStore(
    subscribeBackgroundSubmission,
    getBackgroundSubmission,
    getServerBackgroundSubmission
  )
