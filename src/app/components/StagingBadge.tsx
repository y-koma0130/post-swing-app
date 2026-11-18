import { Badge } from '@/app/components/ui/Badge'
import { isStaging } from '@/server/utils/siteUrl'

/** staging 環境のときだけ、ヘッダーのロゴの横に出す目印。本番と取り違えないため */
export const StagingBadge = () => (isStaging() ? <Badge tone="warning">stg環境</Badge> : null)
