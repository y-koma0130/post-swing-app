-- プランの説明の初期値を「動画◯本」から「提出◯回・チャット◯通」に変える。
-- コーチが書き換えていない（初期値のままの）説明だけを置き換える
UPDATE `plan` SET `description` = '提出1回・チャット10通までのミニ添削'
  WHERE `kind` = 'trial' AND `description` = '1回の提出（正面・後方の動画2本まで）のミニ添削';--> statement-breakpoint
UPDATE `plan` SET `description` = '提出3回・チャット30通まで・30日間'
  WHERE `kind` = 'single' AND `description` = '提出3回まで・30日間';--> statement-breakpoint
UPDATE `plan` SET `description` = '毎月1スレッド（提出3回・チャット30通まで）'
  WHERE `kind` = 'monthly' AND `description` = '毎月1スレッド';
