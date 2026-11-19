import 'server-only'

/** 動画・画像の置き場所（R2）。ドリルの動画と共有するので、本体は server/utils に置く */
export {
  type DeleteMediaObject,
  deleteMediaObject,
  type PutMediaObject,
  putMediaObject,
  respondWithMediaObject,
} from '@/server/utils/mediaStorage'
