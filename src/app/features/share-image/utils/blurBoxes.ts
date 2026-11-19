/** ぼかす範囲（画像の幅・高さに対して 0〜1） */
export type BlurBox = Readonly<{ x: number; y: number; width: number; height: number }>

/** 自動で見つけた顔の範囲を、上下左右に広げる割合（髪・耳まで隠す） */
export const FACE_MARGIN = 0.2
/** 手で足すときの枠の大きさ（画像に対して） */
export const NEW_BOX_SIZE = 0.16
/** 枠の最小の大きさ（つまんで小さくしすぎないように） */
export const MIN_BOX_SIZE = 0.03

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

/** 枠を画像の中に収める（はみ出した分を切る。小さすぎる枠は最小の大きさにする） */
export const clampBox = (box: BlurBox): BlurBox => {
  const width = Math.min(1, Math.max(MIN_BOX_SIZE, box.width))
  const height = Math.min(1, Math.max(MIN_BOX_SIZE, box.height))
  return {
    x: Math.min(clamp01(box.x), 1 - width),
    y: Math.min(clamp01(box.y), 1 - height),
    width,
    height,
  }
}

/** 見つけた顔（画素）を 0〜1 の枠にし、上下左右に広げる */
export const faceToBlurBox = (
  face: Readonly<{ originX: number; originY: number; width: number; height: number }>,
  image: Readonly<{ width: number; height: number }>,
  margin = FACE_MARGIN
): BlurBox => {
  const dx = face.width * margin
  const dy = face.height * margin
  const x = Math.max(0, face.originX - dx)
  const y = Math.max(0, face.originY - dy)
  const right = Math.min(image.width, face.originX + face.width + dx)
  const bottom = Math.min(image.height, face.originY + face.height + dy)
  return clampBox({
    x: x / image.width,
    y: y / image.height,
    width: (right - x) / image.width,
    height: (bottom - y) / image.height,
  })
}

/** 1枚の画像のぼかしの様子 */
export type ImageBlur = Readonly<{
  boxes: ReadonlyArray<BlurBox>
  /** コーチが「この画像に顔は写っていません」と確かめた */
  noFace: boolean
}>

/**
 * 書き出してよいか
 *
 * - 生徒が「顔をぼかす」を選んでいたら、どの画像にもぼかしの枠があるか、「顔は写っていません」の確認が要る
 *   （自動の検出は外れることがあるので、コーチの確認を必須にする）
 * - 顔を出してよい生徒なら、そのまま書き出せる
 */
export const blurCheckPassed = (images: ReadonlyArray<ImageBlur>, blurRequired: boolean): boolean =>
  !blurRequired || images.every((image) => image.noFace || image.boxes.length > 0)
