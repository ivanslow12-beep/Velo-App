import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { Op } from 'sequelize';
import { EmailMessage, EmailRule } from '../models/index.js';
import { matchesIwoVeloEmail } from './emailFilter.js';

const MAX_MESSAGES_PER_SYNC = 100;
const FETCH_BATCH_SIZE = 10;

function getImapConfig(connection) {
  const providerHosts = {
    GMAIL: 'imap.gmail.com',
    OUTLOOK: 'outlook.office365.com',
  };
  const host = connection.imap_host || providerHosts[connection.provider];
  if (!host) throw new Error('IMAP host is required for this email provider');

  const auth = connection.auth_type === 'OAUTH2'
    ? { user: connection.email_address, accessToken: connection.oauth_token }
    : { user: connection.email_address, pass: connection.password };
  if (!auth.user || (connection.auth_type === 'OAUTH2' ? !auth.accessToken : !auth.pass)) {
    throw new Error('Email address and valid mailbox credentials are required');
  }

  return {
    host,
    port: connection.imap_port || 993,
    secure: connection.imap_secure !== false,
    auth,
    socketTimeout: 300_000,
    logger: false,
  };
}

function observeClientErrors(client) {
  let clientError = null;
  client.on('error', (err) => {
    clientError ||= err;
  });
  return () => {
    if (clientError) throw clientError;
  };
}

function getAddressList(addresses) {
  return (addresses?.value || []).map(({ address }) => address).filter(Boolean);
}

function htmlToText(html) {
  return html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function toFilterMessage(parsed) {
  return {
    from: getAddressList(parsed.from).join(', '),
    subject: parsed.subject || '',
    to: [...getAddressList(parsed.to), ...getAddressList(parsed.cc)].join(', '),
    body: [parsed.text, typeof parsed.html === 'string' ? htmlToText(parsed.html) : ''].filter(Boolean).join('\n'),
  };
}

export async function testEmailConnection(connection) {
  const client = new ImapFlow(getImapConfig(connection));
  const ensureClientHealthy = observeClientErrors(client);
  try {
    await client.connect();
    const mailbox = await client.mailboxOpen(connection.folder || 'INBOX', { readOnly: true });
    ensureClientHealthy();
    return { connected: true, mailbox: mailbox.path };
  } finally {
    if (client.usable) await client.logout();
  }
}

export async function syncEmailConnection(connection) {
  const client = new ImapFlow(getImapConfig(connection));
  const ensureClientHealthy = observeClientErrors(client);
  let lock;
  let imported = 0;
  let ignored = 0;
  let processed = 0;

  try {
    await client.connect();
    lock = await client.getMailboxLock(connection.folder || 'INBOX');

    const mailbox = client.mailbox;
    const uidValidity = mailbox.uidValidity?.toString() || null;
    const cursorIsValid = connection.last_sync_uid !== null
      && connection.last_sync_uid_validity === uidValidity;
    const criteria = cursorIsValid
      ? { uid: `${connection.last_sync_uid + 1}:*` }
      : connection.last_sync_at
        ? { since: new Date(connection.last_sync_at) }
        : { all: true };
    const uids = ((await client.search(criteria, { uid: true })) || []).sort((a, b) => a - b);
    ensureClientHealthy();
    const selectedUids = uids.slice(0, MAX_MESSAGES_PER_SYNC);
    const rules = await EmailRule.findAll({
      where: { email_connection_id: connection.id, is_active: true },
    });

    for (let start = 0; start < selectedUids.length; start += FETCH_BATCH_SIZE) {
      const batchUids = selectedUids.slice(start, start + FETCH_BATCH_SIZE);
      for await (const message of client.fetch(
        batchUids,
        { uid: true, source: true, envelope: true, internalDate: true, flags: true },
        { uid: true },
      )) {
        ensureClientHealthy();
        const parsed = await simpleParser(message.source);
        const filterMessage = toFilterMessage(parsed);
        if (matchesIwoVeloEmail(filterMessage, rules)) {
          const messageId = parsed.messageId || `uid-${message.uid}`;
          const storedMessageId = `${connection.id}:${messageId}`;
          const exists = await EmailMessage.findOne({
            where: {
              [Op.or]: [
                { email_connection_id: connection.id, message_id: messageId },
                { email_connection_id: connection.id, message_id: storedMessageId },
              ],
            },
          });

          if (!exists) {
            const isRead = rules.some((rule) =>
              rule.action === 'MARK_READ' && matchesIwoVeloEmail(filterMessage, [rule]),
            ) || message.flags?.has('\\Seen') || false;

            await EmailMessage.create({
              email_connection_id: connection.id,
              message_id: storedMessageId,
              subject: parsed.subject || null,
              from_address: getAddressList(parsed.from)[0] || null,
              from_name: parsed.from?.value?.[0]?.name || null,
              to_addresses: JSON.stringify([...getAddressList(parsed.to), ...getAddressList(parsed.cc)]),
              body_text: parsed.text || null,
              body_html: typeof parsed.html === 'string' ? parsed.html : null,
              received_at: parsed.date || message.internalDate || new Date(),
              is_read: isRead,
              folder: connection.folder || 'INBOX',
            });
            imported += 1;
          }
        } else {
          ignored += 1;
        }
        processed += 1;
      }

      ensureClientHealthy();
      await connection.update({
        last_sync_uid: batchUids[batchUids.length - 1],
        last_sync_uid_validity: uidValidity,
      });
    }

    if (!selectedUids.length && !cursorIsValid) {
      await connection.update({
        last_sync_uid: Math.max(0, (mailbox.uidNext || 1) - 1),
        last_sync_uid_validity: uidValidity,
      });
    }

    const syncedAt = new Date();
    await connection.update({
      last_sync_at: syncedAt,
      last_error: null,
      status: 'ACTIVE',
    });
    return {
      synced_at: syncedAt,
      new_messages_count: imported,
      ignored_messages_count: ignored,
      processed_messages_count: processed,
      has_more: uids.length > selectedUids.length,
    };
  } catch (err) {
    await connection.update({ last_error: err.message, status: 'ERROR' });
    throw err;
  } finally {
    lock?.release();
    if (client.usable) await client.logout();
  }
}
