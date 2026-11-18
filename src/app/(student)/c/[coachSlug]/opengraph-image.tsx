import { ImageResponse } from 'next/og'
import { getCoachAvatarImage, getCoachProfile } from '@/server/features/coach/presentation/queries'
import { loadGoogleFont } from '@/server/utils/loadGoogleFont'
import { getSiteUrl } from '@/server/utils/siteUrl'
import markSvg from '../../../../../public/brand/swingpost-mark.svg?raw'

export const alt = 'SwingPost の受付ページ'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

type Props = {
  params: Promise<{ coachSlug: string }>
}

const FONT = 'Noto Sans JP'
const TAGLINE = 'スイング動画の添削を受付中'
const MARK = `data:image/svg+xml;base64,${btoa(markSvg)}`

/** バイト列を data URI に（OG 画像の描画は外の URL を読みに行けないので、埋め込む） */
const toDataUri = (data: ArrayBuffer, contentType: string): string => {
  const bytes = new Uint8Array(data)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return `data:${contentType};base64,${btoa(binary)}`
}

/** 既定の画像へ（コーチが見つからない、フォントが取れないとき） */
const fallback = () => Response.redirect(new URL('/og-default.png', getSiteUrl()), 302)

/**
 * 受付ページのカード画像。コーチの名前と肩書きを入れる
 *
 * 名前を変えたら作り直したいので、キャッシュは1時間にする（SNS 側でもキャッシュされる）
 */
const OpengraphImage = async ({ params }: Props) => {
  const { coachSlug } = await params
  const coach = await getCoachProfile(coachSlug)
  if (!coach) return fallback()

  const text = `${coach.name}${coach.title}${coach.instagram}${TAGLINE}SwingPost`
  const [bold, regular, avatar] = await Promise.all([
    loadGoogleFont(FONT, 700, text),
    loadGoogleFont(FONT, 400, text),
    getCoachAvatarImage(coachSlug),
  ])
  if (!bold || !regular) return fallback()

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '72px 80px',
        background: '#FAF7F0',
        fontFamily: FONT,
        color: '#0B3D2C',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <img src={MARK} width={72} height={72} alt="" />
        <div style={{ display: 'flex', fontSize: 34, fontWeight: 700 }}>SwingPost</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 48 }}>
        {avatar && (
          <img
            src={toDataUri(avatar.data, avatar.contentType)}
            width={220}
            height={220}
            alt=""
            style={{ borderRadius: 999, objectFit: 'cover' }}
          />
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {coach.title && (
            <div style={{ display: 'flex', fontSize: 34, color: '#3A3D3C' }}>{coach.title}</div>
          )}
          <div style={{ display: 'flex', fontSize: 84, fontWeight: 700, lineHeight: 1.15 }}>
            {coach.name}
          </div>
          {coach.instagram && (
            <div style={{ display: 'flex', fontSize: 30, color: '#3A3D3C' }}>{coach.instagram}</div>
          )}
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          alignSelf: 'flex-start',
          padding: '14px 32px',
          borderRadius: 999,
          background: '#3FBF87',
          fontSize: 34,
          fontWeight: 700,
        }}
      >
        {TAGLINE}
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: FONT, data: bold, weight: 700, style: 'normal' },
        { name: FONT, data: regular, weight: 400, style: 'normal' },
      ],
      headers: { 'cache-control': 'public, max-age=3600' },
    }
  )
}

export default OpengraphImage
