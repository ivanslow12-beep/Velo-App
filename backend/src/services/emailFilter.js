const FIELD_NAMES = {
  FROM: 'from',
  SUBJECT: 'subject',
  TO: 'to',
  BODY: 'body',
};

function normalize(value) {
  return String(value ?? '').toLocaleLowerCase().trim();
}

export function matchesEmailRule(message, rule) {
  const field = FIELD_NAMES[rule.condition_field];
  if (!field) return false;

  const actual = normalize(message[field]);
  const expected = normalize(rule.condition_value);
  if (!expected) return false;

  switch (rule.condition_operator) {
    case 'EQUALS':
      return actual === expected;
    case 'STARTS_WITH':
      return actual.startsWith(expected);
    case 'CONTAINS':
      return actual.includes(expected);
    default:
      return false;
  }
}

export function matchesIwoVeloEmail(message, rules = []) {
  const searchableText = normalize([
    message.from,
    message.subject,
    message.to,
    message.body,
  ].join(' '));
  if (!searchableText.includes('iwo') || !searchableText.includes('velo')) return false;

  const activeRules = rules.filter((rule) => rule.is_active);
  if (activeRules.some((rule) => rule.action === 'SKIP' && matchesEmailRule(message, rule))) return false;

  const acceptingRules = activeRules.filter((rule) => rule.action !== 'SKIP');
  return acceptingRules.every((rule) => matchesEmailRule(message, rule));
}
