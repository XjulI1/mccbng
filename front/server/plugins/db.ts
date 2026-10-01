import { defineNitroPlugin } from 'nitropack/runtime'
import { closeDb } from '../db/client'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('close', closeDb)
})
