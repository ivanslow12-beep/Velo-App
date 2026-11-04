import { EmailConnection } from '../models/index.js';
import { syncEmailConnection } from './emailSyncService.js';

const POLL_INTERVAL_MS = 60_000;
const syncingConnections = new Set();
const lastAttemptAt = new Map();

async function syncDueConnections() {
  try {
    const connections = await EmailConnection.findAll({ where: { status: ['ACTIVE', 'ERROR'] } });
    const now = Date.now();

    for (const connection of connections) {
      const intervalMs = Math.max(1, Number(connection.sync_interval) || 5) * 60_000;
      const lastSync = connection.status === 'ERROR'
        ? lastAttemptAt.get(connection.id) || (connection.last_sync_at ? new Date(connection.last_sync_at).getTime() : 0)
        : (connection.last_sync_at ? new Date(connection.last_sync_at).getTime() : 0);
      if (lastSync && now - lastSync < intervalMs) continue;
      if (syncingConnections.has(connection.id)) continue;

      syncingConnections.add(connection.id);
      lastAttemptAt.set(connection.id, now);
      try {
        await syncEmailConnection(connection);
        lastAttemptAt.delete(connection.id);
      } catch (err) {
        console.error(`Automatic email sync failed for ${connection.email_address}:`, err.message);
      } finally {
        syncingConnections.delete(connection.id);
      }
    }
  } catch (err) {
    console.error('Failed to check email connections for automatic sync:', err);
  }
}

export function startEmailSyncScheduler() {
  const timer = setInterval(syncDueConnections, POLL_INTERVAL_MS);
  timer.unref();
  syncDueConnections();
}
