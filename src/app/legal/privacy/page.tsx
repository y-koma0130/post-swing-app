import { permanentRedirect } from 'next/navigation'
import { PRIVACY_POLICY_URL } from '@/app/utils/externalLinks'

/** プライバシーポリシーは LP にある（生徒・コーチ共通）。以前のリンクのために残す */
const PrivacyPage = () => permanentRedirect(PRIVACY_POLICY_URL)

export default PrivacyPage
