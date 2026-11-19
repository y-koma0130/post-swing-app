-- 画面の呼び方を「スレッド」から「レッスン」にそろえる。
-- コーチが書き換えていない（初期値のままの）プラン名と説明だけを置き換える
UPDATE `plan` SET `name` = '1レッスン'
  WHERE `kind` = 'single' AND `name` = '1スレッド';--> statement-breakpoint
UPDATE `plan` SET `description` = '毎月1レッスン（提出3回・チャット30通まで）'
  WHERE `kind` = 'monthly' AND `description` = '毎月1スレッド（提出3回・チャット30通まで）';
