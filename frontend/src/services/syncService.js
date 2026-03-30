/**
 * Synchronization Service
 * Uses BroadcastChannel to communicate between tabs on the same origin.
 * Especially useful for 'live' updates between Admin and Student views.
 */

const SYNC_CHANNEL = 'neuralingua_sync_channel';
let channel = null;

try {
    if (typeof window !== 'undefined' && window.BroadcastChannel) {
        channel = new BroadcastChannel(SYNC_CHANNEL);
    }
} catch (e) {
    console.warn('[SyncService] BroadcastChannel not supported in this browser.');
}

/**
 * Broadcast a message to all other tabs
 * @param {string} type - 'questions_updated' | 'user_updated' | etc.
 * @param {object} payload - any data to send
 */
export const broadcast = (type, payload = {}) => {
    if (!channel) return;
    try {
        channel.postMessage({ type, payload, timestamp: Date.now() });
    } catch (e) {
        console.error('[SyncService] Broadcast failed:', e);
    }
};

/**
 * Listen for messages from other tabs
 * @param {function} callback - (type, payload) => void
 * @returns {function} unsubscribe function
 */
export const subscribe = (callback) => {
    if (!channel) return () => {};
    
    const handler = (event) => {
        const { type, payload } = event.data;
        callback(type, payload);
    };
    
    channel.addEventListener('message', handler);
    return () => channel.removeEventListener('message', handler);
};

export default { broadcast, subscribe };
