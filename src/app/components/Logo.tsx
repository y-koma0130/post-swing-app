type Props = {
  /** 表示する高さ（px）。幅は比率から決まる */
  height?: number
  className?: string
}

/** ロゴ（マーク＋文字）の縦横比。public/brand/swingpost-logo.svg の viewBox から */
const LOGO_RATIO = 436.8 / 112

/** SwingPost のロゴ。画像は public/brand/ に置いた SVG */
export const Logo = ({ height = 28, className = '' }: Props) => (
  <img
    src="/brand/swingpost-logo.svg"
    alt="SwingPost"
    width={Math.round(height * LOGO_RATIO)}
    height={height}
    className={className}
  />
)
