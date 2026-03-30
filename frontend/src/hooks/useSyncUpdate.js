import { useEffect } from 'react'
import syncService from '../services/syncService'

/**
 * Custom hook to handle live updates from the admin portal
 * @param {string} moduleName - The name of the module to listen for (e.g., 'grammar', 'reading')
 * @param {Function} onUpdate - The callback to execute when an update is detected (usually a fetch function)
 */
export default function useSyncUpdate(moduleName, onUpdate) {
  useEffect(() => {
    if (!moduleName || !onUpdate) return

    const unsubscribe = syncService.subscribe((type, payload) => {
      if (type === 'questions_updated' && payload.module === moduleName) {
        console.log(`[Sync] ${moduleName} updated, triggering re-fetch...`)
        onUpdate()
      }
    })

    return unsubscribe
  }, [moduleName, onUpdate])
}
