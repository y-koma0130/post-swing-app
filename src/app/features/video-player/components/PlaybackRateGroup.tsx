import { segmentClass, segmentGroupClass } from '@/app/components/ui/choiceStyles'
import { PLAYBACK_RATES, type PlaybackRate } from '../utils/frame'

type Props = {
  rate: PlaybackRate
  disabled: boolean
  onChange: (rate: PlaybackRate) => void
}

/** 再生速度（0.25x／0.5x／1x）の切り替え */
export const PlaybackRateGroup = ({ rate, disabled, onChange }: Props) => (
  <fieldset className={`${segmentGroupClass} ml-2`}>
    <legend className="sr-only">再生速度</legend>
    {PLAYBACK_RATES.map((value) => (
      <button
        key={value}
        type="button"
        aria-pressed={rate === value}
        disabled={disabled}
        onClick={() => onChange(value)}
        className={segmentClass(rate === value)}
      >
        {value}x
      </button>
    ))}
  </fieldset>
)
