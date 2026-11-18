import { z } from 'zod'

/** 撮った角度。コーチが見方を変えるので、生徒が選んで送る */
export const videoAngleSchema = z.enum(['front', 'back', 'other'])

export type VideoAngle = z.infer<typeof videoAngleSchema>
