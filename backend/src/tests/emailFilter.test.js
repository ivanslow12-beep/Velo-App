import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { matchesEmailRule, matchesIwoVeloEmail } from '../services/emailFilter.js';

describe('email filtering', () => {
  it('accepts default IWO VELO messages across sender, subject, recipients, and body', () => {
    assert.equal(matchesIwoVeloEmail({
      from: 'orders@velo.co.id',
      subject: 'Permintaan IWO baru',
      to: '',
      body: '',
    }), true);
    assert.equal(matchesIwoVeloEmail({
      from: 'orders@example.com',
      subject: 'Permintaan',
      to: '',
      body: 'Tolong proses IWO untuk VELO',
    }), true);
  });

  it('rejects messages that do not contain both IWO and VELO', () => {
    assert.equal(matchesIwoVeloEmail({
      from: 'orders@velo.co.id',
      subject: 'Permintaan baru',
      to: '',
      body: 'Mohon ditindaklanjuti',
    }), false);
  });

  it('applies all active acceptance rules and excludes matching skip rules', () => {
    const message = {
      from: 'IWO Team <orders@velo.co.id>',
      subject: 'Permintaan',
      to: 'inbox@example.com',
      body: 'Mohon diproses',
    };
    const rules = [
      { condition_field: 'FROM', condition_operator: 'CONTAINS', condition_value: '@velo.co.id', action: 'LINK_IWO', is_active: true },
      { condition_field: 'BODY', condition_operator: 'CONTAINS', condition_value: 'diproses', action: 'MARK_READ', is_active: true },
    ];
    assert.equal(matchesIwoVeloEmail(message, rules), true);

    rules.push({
      condition_field: 'SUBJECT',
      condition_operator: 'CONTAINS',
      condition_value: 'spam',
      action: 'SKIP',
      is_active: true,
    });
    assert.equal(matchesIwoVeloEmail(message, rules), true);
    rules[2].condition_value = 'permintaan';
    assert.equal(matchesIwoVeloEmail(message, rules), false);
  });

  it('supports case-insensitive comparisons and ignores inactive rules', () => {
    assert.equal(matchesEmailRule(
      { body: 'Permintaan IWO VELO' },
      { condition_field: 'BODY', condition_operator: 'CONTAINS', condition_value: 'iwo velo' },
    ), true);
    assert.equal(matchesIwoVeloEmail(
      { from: '', subject: '', to: '', body: '' },
      [{ condition_field: 'BODY', condition_operator: 'CONTAINS', condition_value: 'IWO', is_active: false }],
    ), false);
  });
});
