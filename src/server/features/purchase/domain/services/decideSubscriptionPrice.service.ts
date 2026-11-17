export type DecideSubscriptionPrice = (
  input: Readonly<{ currentPriceYen: number; newPlanPriceYen: number }>
) => number | null

/**
 * コーチが月額の価格を変えたとき、いま続けている生徒の価格をどうするか。変えるなら新しい価格を返す
 *
 * ドメインルール:
 * - 値下げは、いまの生徒にも次の請求から反映する（生徒が得をするだけなので同意は要らない）
 * - 値上げは、新しく申し込む人からだけ。いまの生徒は申し込んだ価格のまま
 */
export const decideSubscriptionPrice: DecideSubscriptionPrice = ({
  currentPriceYen,
  newPlanPriceYen,
}) => (newPlanPriceYen < currentPriceYen ? newPlanPriceYen : null)
