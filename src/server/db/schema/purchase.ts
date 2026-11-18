import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { user } from './auth'
import { coachProfile } from './coach'

const timestamps = {
  createdAt: integer({ mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer({ mode: 'timestamp_ms' }).notNull(),
}

/**
 * 生徒の申し込み（Stripe Checkout 1回分）
 * お試し・1スレッドは、カードを仮押さえ（authorized）→ コーチが承認したら支払い済み（paid）、断ったら取り消し（voided）。
 * 月額は、この1行に対して毎月スレッドが1つずつ作られる
 */
export const purchase = sqliteTable(
  'purchase',
  {
    id: text().primaryKey(),
    studentUserId: text()
      .notNull()
      .references(() => user.id),
    coachUserId: text()
      .notNull()
      .references(() => coachProfile.userId),
    planKind: text({ enum: ['trial', 'single', 'monthly'] }).notNull(),
    /** 申し込んだ時点の価格（あとでコーチが価格を変えても変わらない） */
    priceYen: integer().notNull(),
    /** 生徒が別に払うシステム利用料（申し込んだ時点の値。月額は毎月）。以前の申し込みは0 */
    systemFeeYen: integer().notNull().default(0),
    status: text({ enum: ['pending', 'authorized', 'paid', 'voided', 'canceled'] }).notNull(),
    stripeCheckoutSessionId: text().unique(),
    /** カードを仮押さえした支払い（承認で確定、断ったら取り消す） */
    stripePaymentIntentId: text().unique(),
    stripeCustomerId: text(),
    stripeSubscriptionId: text().unique(),
    ...timestamps,
  },
  (t) => [
    index('purchase_student_coach_idx').on(t.studentUserId, t.coachUserId),
    index('purchase_coach_idx').on(t.coachUserId),
  ]
)

/**
 * 実際にお金が動いた1回ごとの記録（承認での確定、月額の毎月の請求）。
 * そのときの手数料率と、使った特典を残す。id は支払いから決まる（capture-<申し込み>、invoice-<請求書>）ので、
 * 同じ支払いを2回記録しない
 */
export const payment = sqliteTable(
  'payment',
  {
    id: text().primaryKey(),
    purchaseId: text()
      .notNull()
      .references(() => purchase.id),
    coachUserId: text().notNull(),
    kind: text({ enum: ['capture', 'invoice'] }).notNull(),
    priceYen: integer().notNull(),
    systemFeeYen: integer().notNull(),
    /** 使った手数料率 */
    platformFeeRate: real().notNull(),
    /** 価格の手数料（システム利用料は含めない） */
    platformFeeYen: integer().notNull(),
    /** 使った特典（coach_fee_grant）。なければ null */
    feeGrantId: text(),
    /** 請求のあとで Application Fee を返金して戻した額（invoice.created が届かず多く取ったとき） */
    feeAdjustedYen: integer().notNull().default(0),
    /** 生徒に返金した額と、そのとき戻した Application Fee */
    refundedYen: integer().notNull().default(0),
    refundedFeeYen: integer().notNull().default(0),
    refundedAt: integer({ mode: 'timestamp_ms' }),
    stripePaymentIntentId: text(),
    stripeInvoiceId: text().unique(),
    paidAt: integer({ mode: 'timestamp_ms' }).notNull(),
    createdAt: integer({ mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [
    index('payment_purchase_idx').on(t.purchaseId),
    index('payment_coach_idx').on(t.coachUserId, t.paidAt),
  ]
)

/** 処理済みの Stripe のイベント。同じイベントが2回届いても1回だけ処理する */
export const stripeEvent = sqliteTable('stripe_event', {
  id: text().primaryKey(),
  type: text().notNull(),
  processedAt: integer({ mode: 'timestamp_ms' }).notNull(),
})

/** キャンセル待ち */
export const waitlistEntry = sqliteTable(
  'waitlist_entry',
  {
    id: text().primaryKey(),
    coachUserId: text()
      .notNull()
      .references(() => coachProfile.userId, { onDelete: 'cascade' }),
    studentUserId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: integer({ mode: 'timestamp_ms' }).notNull(),
    /** 空きが出たと知らせた日時 */
    notifiedAt: integer({ mode: 'timestamp_ms' }),
  },
  (t) => [uniqueIndex('waitlist_coach_student_idx').on(t.coachUserId, t.studentUserId)]
)
