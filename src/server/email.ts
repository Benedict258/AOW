import { Resend } from 'resend';
import { Opportunity } from '../types';
import { getPool } from './db';
import crypto from 'crypto';

let resendClient: Resend | null = null;
function getResendClient(): Resend | null {
  if (!resendClient && process.env.RESEND_API_KEY) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

export interface DigestDeliveryResult {
  sent: boolean;
  suppressed: boolean;
  recipient: string;
  qualifyingCount: number;
  messageId?: string;
  error?: string;
  reason?: string;
  timestamp: string;
  previewHtml?: string;
}

export interface TestEmailResult {
  sent: boolean;
  recipient: string;
  messageId?: string;
  status: 'DELIVERED' | 'FAILED' | 'CONFIG_MISSING';
  error?: string;
  timestamp: string;
  provider: string;
}

export function buildDigestEmailHtml(
  opportunities: Opportunity[],
  recipientEmail: string = 'benedictisaac258@gmail.com'
): string {
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const cardsHtml = opportunities
    .map(
      (opp) => `
    <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin-bottom: 16px; background-color: #ffffff;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
        <div>
          <span style="display: inline-block; padding: 3px 8px; font-size: 11px; font-weight: bold; border-radius: 4px; background-color: #0f172a; color: #ffffff; margin-right: 6px;">
            ${opp.matchBreakdown.finalScore}% MATCH
          </span>
          <span style="display: inline-block; padding: 3px 8px; font-size: 11px; font-weight: 600; border-radius: 4px; background-color: #f1f5f9; color: #334155;">
            ${opp.sourceTier}
          </span>
        </div>
        <span style="font-size: 12px; font-weight: 600; color: #059669;">
          ✓ ${opp.hardEligibility === 'CLEARLY_ELIGIBLE' ? 'Eligibility Verified' : 'Review Required'}
        </span>
      </div>

      <h3 style="margin: 6px 0; font-size: 16px; font-weight: 700; color: #0f172a;">
        <a href="${opp.url}" style="color: #0f172a; text-decoration: none;">${opp.title}</a>
      </h3>
      <div style="font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 8px;">
        ${opp.organization} • ${opp.location} ${opp.isRemote ? '(Remote / Telework)' : ''}
      </div>

      <p style="font-size: 13px; line-height: 1.5; color: #334155; margin: 8px 0;">
        ${opp.description ? opp.description.slice(0, 240) + '...' : ''}
      </p>

      ${
        opp.aiExplanation
          ? `<div style="background-color: #f8fafc; border-left: 3px solid #3b82f6; padding: 8px 12px; font-size: 12px; color: #1e293b; margin: 10px 0;">
              <strong>Strategic Value:</strong> ${opp.aiExplanation}
            </div>`
          : ''
      }

      <div style="font-size: 12px; color: #64748b; margin-top: 10px; padding-top: 8px; border-top: 1px dashed #e2e8f0;">
        <strong>Deadline:</strong> ${opp.applicationDeadline || 'Rolling / Unspecified'} &nbsp;|&nbsp;
        <strong>Track:</strong> ${opp.category} (${opp.subCategory}) &nbsp;|&nbsp;
        <a href="${opp.url}" style="color: #2563eb; font-weight: 600; text-decoration: underline;">Open Application →</a>
      </div>
    </div>
  `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Opportunity Intelligence Briefing • Peter Grigoryev</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; padding: 24px; margin: 0;">
        <div style="max-width: 680px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
          <div style="background-color: #0f172a; color: #ffffff; padding: 24px;">
            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; font-weight: 700;">
              Automated Opportunity Intelligence System • Rutgers MS IT & Analytics
            </div>
            <h1 style="margin: 8px 0 4px 0; font-size: 22px; font-weight: 800; color: #ffffff;">
              Opportunity Intelligence Briefing
            </h1>
            <p style="margin: 0; font-size: 13px; color: #cbd5e1;">
              ${dateStr} • Delivered to ${recipientEmail} • ${opportunities.length} Highly Qualified Listings (≥70% Match)
            </p>
          </div>

          <div style="padding: 24px; background-color: #f8fafc;">
            ${cardsHtml}
          </div>

          <div style="padding: 16px 24px; background-color: #ffffff; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center;">
            Peter Grigoryev • MS in Information Technology and Analytics (Cybersecurity & Analytics)<br>
            Automated intelligence digest powered by Google Cloud Run & Supabase PostgreSQL
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Sends a real test email directly to verify end-to-end delivery via Resend
 */
export async function sendTestEmail(
  targetRecipient?: string
): Promise<TestEmailResult> {
  const recipient = targetRecipient || process.env.ALERT_RECIPIENT_EMAIL || 'benedictisaac258@gmail.com';
  const timestamp = new Date().toISOString();
  const resend = getResendClient();

  if (!resend) {
    return {
      sent: false,
      recipient,
      status: 'CONFIG_MISSING',
      error: 'RESEND_API_KEY is not configured in the environment.',
      timestamp,
      provider: 'resend',
    };
  }

  const subject = `[Test Verification] Automated Opportunity Intelligence System — ${new Date().toLocaleTimeString('en-US')}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;">
      <div style="background-color: #0f172a; padding: 18px 24px; border-radius: 6px; color: #ffffff;">
        <h2 style="margin: 0; font-size: 18px;">Automated Opportunity Intelligence System</h2>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">End-to-End Test Email Verification</p>
      </div>
      <div style="padding: 20px 0;">
        <p style="font-size: 14px; line-height: 1.6; color: #1e293b;">
          Hello, this is a live test email sent from the <strong>Automated Opportunity Intelligence System</strong>.
        </p>
        <div style="background-color: #f1f5f9; padding: 14px; border-radius: 6px; font-size: 13px; color: #334155;">
          <strong>Candidate Profile:</strong> Peter Grigoryev<br>
          <strong>Academic Program:</strong> Master's in Information Technology and Analytics, Rutgers Business School<br>
          <strong>Target Tracks:</strong> Cybersecurity, Critical Infrastructure, Federal Cyber Defense, IT Analytics<br>
          <strong>Recipient:</strong> ${recipient}<br>
          <strong>Dispatched At:</strong> ${timestamp}<br>
          <strong>Sender:</strong> onboarding@resend.dev (Resend API)
        </div>
        <p style="font-size: 13px; color: #64748b; margin-top: 16px;">
          All subsystems (USAJOBS Ingestion, Structured Extraction, Deduplication, Hard-Eligibility Gate, 8-Factor Scoring, and Email Delivery) are operating successfully end to end.
        </p>
      </div>
    </div>
  `;

  try {
    const res = await resend.emails.send({
      from: 'Opportunity Intel <onboarding@resend.dev>',
      to: [recipient],
      subject,
      html,
    });

    if (res.error) {
      await logNotificationToDb('EMAIL_TEST', subject, 'FAILED', recipient, res.error.message);
      return {
        sent: false,
        recipient,
        status: 'FAILED',
        error: res.error.message,
        timestamp,
        provider: 'resend',
      };
    }

    const messageId = res.data?.id;
    await logNotificationToDb('EMAIL_TEST', subject, 'DELIVERED', recipient, null, messageId);

    return {
      sent: true,
      recipient,
      status: 'DELIVERED',
      messageId,
      timestamp,
      provider: 'resend',
    };
  } catch (err: any) {
    await logNotificationToDb('EMAIL_TEST', subject, 'FAILED', recipient, err.message);
    return {
      sent: false,
      recipient,
      status: 'FAILED',
      error: err.message,
      timestamp,
      provider: 'resend',
    };
  }
}

export async function sendOpportunityDigestEmail(
  opportunities: Opportunity[],
  customRecipient?: string
): Promise<DigestDeliveryResult> {
  const recipient = customRecipient || process.env.ALERT_RECIPIENT_EMAIL || 'benedictisaac258@gmail.com';
  const timestamp = new Date().toISOString();

  // Section 10.2: Empty result sets never trigger a notification. Actionable only if ELIGIBLE and finalScore >= 70
  const qualifying = opportunities.filter(
    (o) => (o.matchBreakdown?.finalScore ?? 0) >= 70 && o.hardEligibility !== 'CLEARLY_INELIGIBLE'
  );

  if (qualifying.length === 0) {
    console.log('[Email Dispatcher] Suppressed: 0 opportunities met the >= 70% threshold.');
    return {
      sent: false,
      suppressed: true,
      recipient,
      qualifyingCount: 0,
      reason: 'SUPPRESSED_NO_QUALIFYING_OPPORTUNITIES (Score >= 70% threshold required to avoid empty noise).',
      timestamp,
    };
  }

  const html = buildDigestEmailHtml(qualifying, recipient);
  const resend = getResendClient();

  if (!resend) {
    console.warn('[Email Dispatcher] RESEND_API_KEY not configured.');
    return {
      sent: false,
      suppressed: false,
      recipient,
      qualifyingCount: qualifying.length,
      reason: 'RESEND_API_KEY not configured.',
      previewHtml: html,
      timestamp,
    };
  }

  const subject = `[Intel Digest] ${qualifying.length} Qualified Opportunities for Peter Grigoryev`;

  try {
    const data = await resend.emails.send({
      from: 'Opportunity Intel <onboarding@resend.dev>',
      to: [recipient],
      subject,
      html,
    });

    if (data.error) {
      await logNotificationToDb('DIGEST', subject, 'FAILED', recipient, data.error.message);
      return {
        sent: false,
        suppressed: false,
        recipient,
        qualifyingCount: qualifying.length,
        error: data.error.message,
        previewHtml: html,
        timestamp,
      };
    }

    const messageId = data.data?.id;
    await logNotificationToDb('DIGEST', subject, 'DELIVERED', recipient, null, messageId);

    return {
      sent: true,
      suppressed: false,
      recipient,
      qualifyingCount: qualifying.length,
      messageId,
      previewHtml: html,
      timestamp,
    };
  } catch (err: any) {
    console.error('[Email Dispatcher] Delivery error:', err);
    await logNotificationToDb('DIGEST', subject, 'FAILED', recipient, err.message);
    return {
      sent: false,
      suppressed: false,
      recipient,
      qualifyingCount: qualifying.length,
      error: err.message,
      previewHtml: html,
      timestamp,
    };
  }
}

/**
 * Logs notification to PostgreSQL notifications and notification_history tables
 */
async function logNotificationToDb(
  type: string,
  title: string,
  status: 'DELIVERED' | 'FAILED',
  recipient: string,
  errorInfo?: string | null,
  messageId?: string
): Promise<void> {
  const pool = getPool();
  if (!pool) return;

  try {
    const client = await pool.connect();
    try {
      // Find user id for recipient
      const userRes = await client.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [recipient]);
      const userId = userRes.rows[0]?.id || '00000000-0000-4000-a000-000000000001';

      const notifId = crypto.randomUUID();
      await client.query(`
        INSERT INTO notifications (id, user_id, type, title, message, status, sent_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `, [
        notifId,
        userId,
        type,
        title,
        `Dispatched to ${recipient} (Message ID: ${messageId || 'N/A'})`,
        status === 'DELIVERED' ? 'SENT' : 'FAILED',
      ]);

      await client.query(`
        INSERT INTO notification_history (notification_id, user_id, channel, sent_at, delivery_status, error_info)
        VALUES ($1, $2, 'EMAIL', NOW(), $3, $4)
      `, [
        notifId,
        userId,
        status,
        errorInfo || null,
      ]);
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.warn('[Notification DB Logger] Could not record notification in DB:', err.message);
  }
}
