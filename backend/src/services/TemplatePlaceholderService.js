/**
 * TemplatePlaceholderService
 *
 * Manages the catalog of allowed template placeholders and provides
 * secure resolution of {{placeholder}} tokens against a data object.
 *
 * SECURITY: Only whitelisted placeholders are processed. Arbitrary
 * backend code, PHP, JS, Shell, or SQL are completely disallowed.
 */

const PLACEHOLDER_CATALOG = {
  iwo: {
    label: 'IWO',
    fields: [
      { key: 'iwo.iwo_no', label: 'IWO Number' },
      { key: 'iwo.request_date', label: 'Request Date' },
      { key: 'iwo.request_type', label: 'Request Type' },
      { key: 'iwo.deadline_rfs', label: 'Deadline RFS' },
      { key: 'iwo.priority', label: 'Priority' },
      { key: 'iwo.status', label: 'Status' },
      { key: 'iwo.progress', label: 'Progress' },
      { key: 'iwo.notes', label: 'Notes' },
    ],
  },
  customer: {
    label: 'Customer',
    fields: [
      { key: 'customer.name', label: 'Customer Name' },
      { key: 'customer.code', label: 'Customer Code' },
      { key: 'customer.address', label: 'Customer Address' },
      { key: 'customer.contact_name', label: 'Contact Person' },
      { key: 'customer.email', label: 'Customer Email' },
      { key: 'customer.phone', label: 'Customer Phone' },
    ],
  },
  service: {
    label: 'Service',
    fields: [
      { key: 'service.name', label: 'Service Name' },
      { key: 'service.price', label: 'Service Price' },
      { key: 'service.description', label: 'Service Description' },
    ],
  },
  sales: {
    label: 'Sales',
    fields: [
      { key: 'sales.name', label: 'Sales Name' },
      { key: 'sales.email', label: 'Sales Email' },
      { key: 'sales.phone', label: 'Sales Phone' },
    ],
  },
  network: {
    label: 'Network',
    fields: [
      { key: 'network.node_pop', label: 'Node/POP' },
      { key: 'network.connection_type', label: 'Connection Type' },
      { key: 'network.pop_switch', label: 'POP Switch' },
      { key: 'network.switch_port', label: 'Switch Port' },
      { key: 'network.router', label: 'Router' },
      { key: 'network.wan_ip', label: 'WAN IP' },
      { key: 'network.public_ip', label: 'Public IP' },
      { key: 'network.partner', label: 'Partner' },
      { key: 'network.port', label: 'Port' },
      { key: 'network.vlan', label: 'VLAN' },
    ],
  },
  bast: {
    label: 'BAST',
    fields: [
      { key: 'bast.bast_no', label: 'BAST Number' },
      { key: 'bast.active_date', label: 'Active Date' },
      { key: 'bast.status', label: 'BAST Status' },
      { key: 'bast.notes', label: 'BAST Notes' },
    ],
  },
  acc: {
    label: 'ACC',
    fields: [
      { key: 'acc.subscription_number', label: 'Subscription Number' },
      { key: 'acc.contract_number', label: 'Contract Number' },
      { key: 'acc.customer_id', label: 'Customer ID' },
      { key: 'acc.service_id', label: 'Service ID' },
      { key: 'acc.product_id', label: 'Product ID' },
      { key: 'acc.activation_date', label: 'Activation Date' },
      { key: 'acc.start_billing_date', label: 'Start Billing Date' },
      { key: 'acc.monthly_tariff', label: 'Monthly Tariff' },
      { key: 'acc.contract_period', label: 'Contract Period' },
    ],
  },
  sla: {
    label: 'SLA',
    fields: [
      { key: 'sla.availability', label: 'Availability' },
      { key: 'sla.bandwidth_guarantee', label: 'Bandwidth Guarantee' },
      { key: 'sla.customer_support_response', label: 'Support Response' },
      { key: 'sla.hotline', label: 'Hotline' },
      { key: 'sla.email', label: 'SLA Email' },
      { key: 'sla.whatsapp', label: 'WhatsApp' },
    ],
  },
  approvals: {
    label: 'Approvals',
    fields: [
      { key: 'approval.engineer_name', label: 'Engineer Name' },
      { key: 'approval.sales_name', label: 'Sales Name' },
      { key: 'approval.fulfilment_name', label: 'Fulfilment Name' },
      { key: 'approval.manager_mon_name', label: 'Manager Mon Name' },
      { key: 'approval.manager_industry_name', label: 'Manager Industry Name' },
      { key: 'approval.head_oss_name', label: 'Head OSS Name' },
    ],
  },
};

const WHITELIST = new Set(
  Object.values(PLACEHOLDER_CATALOG).flatMap((group) => group.fields.map((f) => f.key))
);

const PLACEHOLDER_REGEX = /\{\{([a-zA-Z0-9_.]+)\}\}/g;

function findSuggestion(invalidKey) {
  const parts = invalidKey.split('.');
  const namespace = parts[0];
  const field = parts[1] || '';

  let bestMatch = null;
  let bestScore = 0;

  for (const key of WHITELIST) {
    if (namespace && key.startsWith(namespace + '.')) {
      const candidateField = key.split('.')[1] || '';
      if (candidateField.includes(field) || field.includes(candidateField)) {
        return key;
      }
    }
  }

  return '{{customer.name}}';
}

export class TemplatePlaceholderService {
  static getCatalog() {
    return PLACEHOLDER_CATALOG;
  }

  static getWhitelist() {
    return WHITELIST;
  }

  static validateTemplate(content) {
    return TemplatePlaceholderService.validatePlaceholders(content);
  }

  static validatePlaceholders(content) {
    const rawString = typeof content === 'object' ? JSON.stringify(content) : String(content);
    const found = [];
    const errors = [];
    const suggestions = {};

    let match;
    const regex = new RegExp(PLACEHOLDER_REGEX.source, 'g');

    while ((match = regex.exec(rawString)) !== null) {
      const key = match[1];
      found.push(key);
      if (!WHITELIST.has(key)) {
        const suggestion = findSuggestion(key);
        errors.push(`Invalid placeholder: {{${key}}}. Suggested: {{${suggestion}}}`);
        suggestions[key] = suggestion;
      }
    }

    const isValid = errors.length === 0;
    return {
      isValid,
      valid: isValid,
      errors,
      suggestions,
      found: [...new Set(found)],
    };
  }

  static resolvePlaceholders(templateString, data) {
    const regex = new RegExp(PLACEHOLDER_REGEX.source, 'g');

    return templateString.replace(regex, (_match, key) => {
      if (!WHITELIST.has(key)) return '';

      const [namespace, ...fieldParts] = key.split('.');
      const field = fieldParts.join('.');
      const nsData = data[namespace];

      if (!nsData || typeof nsData !== 'object') return '';

      const value = nsData[field];
      if (value === null || value === undefined) return '';
      return String(value);
    });
  }
}
