/** 文字入力中のキー操作か（プレイヤーや線引きのショートカットにしない）。DOM を使うので utils ではなくここに置く */
export const isTypingTarget = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
