import PocketBase from 'pocketbase'

export const POCKETBASE_URL =
  import.meta.env.VITE_POCKETBASE_URL ?? 'http://100.111.93.26:8090'

export const pb = new PocketBase(POCKETBASE_URL)

pb.autoCancellation(false)
