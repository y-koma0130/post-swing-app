import 'server-only'

/**
 * notification がほかの feature に公開する関数（ほかの feature は、notification の domain と、このファイルだけを使う）
 */

/** 通知をキューに積む。送り先と文面は notification が決める */
export { enqueueNotification as notify } from './infrastructure/external-services/enqueueNotification'

/** すぐに送るメール（キューを通さない。ログインコードのように、待たせられないもの） */
export { sendEmail } from './infrastructure/external-services/sendEmail'
