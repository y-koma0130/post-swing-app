/** ドリルの動画のルール（形式・大きさ・長さは、生徒の動画と同じ thread の VIDEO_RULES） */
export const DRILL_VIDEO_RULES = {
  /** 上げてからドリルに使わないまま、何時間たったら消すか */
  draftRetentionHours: 24,
} as const
