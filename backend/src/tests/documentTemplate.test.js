import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import sequelize from '../database/sequelize.js';
import {
  User, Customer, Service, IWO, BAST, ACC, DocumentTemplate, DocumentVersion, Attachment, AuditLog
} from '../models/index.js';
import { DocumentTemplateService } from '../services/DocumentTemplateService.js';
import { TemplatePlaceholderService } from '../services/TemplatePlaceholderService.js';
import { DocumentRenderService } from '../services/DocumentRenderService.js';
import { AuthService } from '../services/AuthService.js';
import { BAST_CONTENT } from '../config/defaultTemplates.js';

describe('VELO Document Template Management & Document Generation Test Suite', () => {
  let adminUser;
  let testCustomer;
  let testService;
  let testIwo;

  before(async () => {
    await sequelize.authenticate();

    adminUser = await User.findOne({ where: { role: 'ADMINISTRATOR' } });
    assert.ok(adminUser, 'Admin user must exist from seed');

    testCustomer = await Customer.findOne();
    assert.ok(testCustomer, 'Customer must exist from seed');

    testService = await Service.findOne();
    assert.ok(testService, 'Service must exist from seed');

    // Clean up any previous test templates & records
    await BAST.destroy({ where: { bast_no: 'BAST-TEST-IMMUTABLE-001' } });
    await ACC.destroy({ where: { subscription_number: 'SUB-ACC-TEST-001' } });
    await IWO.destroy({ where: { iwo_no: '000999/VELO/IWO/X/26' } });

    const existingTemplates = await DocumentTemplate.findAll({
      where: { code: ['BAST-TEST-ENTERPRISE', 'ACC-TEST-BROADBAND', 'BAST-ENTERPRISE-VIP', 'BAST-TEST-IMMUTABLE-TMPL'] },
    });
    for (const t of existingTemplates) {
      // Clear all FK dependents before deleting versions (SQLite enforces FK constraints)
      const templateVersions = await DocumentVersion.findAll({ where: { document_template_id: t.id } });
      for (const tv of templateVersions) {
        await BAST.update({ template_version_id: null }, { where: { template_version_id: tv.id } });
        await ACC.update({ template_version_id: null }, { where: { template_version_id: tv.id } });
        await Attachment.destroy({ where: { template_version_id: tv.id } });
      }
      await BAST.update({ template_version_id: null, document_template_id: null }, { where: { document_template_id: t.id } });
      await ACC.update({ template_version_id: null, document_template_id: null }, { where: { document_template_id: t.id } });
      await Attachment.destroy({ where: { document_template_id: t.id } });
      await DocumentVersion.destroy({ where: { document_template_id: t.id } });
      await t.destroy();
    }

    // Also clean up leftover v2.0 on BAST-DEFAULT from previous test runs (restore to v1.0 active)
    const bastDefault = await DocumentTemplate.findOne({ where: { code: 'BAST-DEFAULT' } });
    if (bastDefault) {
      const staleVersions = await DocumentVersion.findAll({
        where: { document_template_id: bastDefault.id },
        order: [['version', 'ASC']],
      });
      const v10 = staleVersions.find((v) => v.version === '1.0');
      // Remove any version > 1.0 that was created by previous test runs
      for (const v of staleVersions) {
        if (v.version !== '1.0') {
          await BAST.update({ template_version_id: null }, { where: { template_version_id: v.id } });
          await ACC.update({ template_version_id: null }, { where: { template_version_id: v.id } });
          await Attachment.destroy({ where: { template_version_id: v.id } });
          await v.destroy();
        }
      }
      // Ensure v1.0 is ACTIVE and is_default restored
      if (v10 && v10.status !== 'ACTIVE') {
        await v10.update({ status: 'ACTIVE', is_current: true });
      }
      if (!bastDefault.is_default) {
        await bastDefault.update({ is_default: true });
      }
    }

    // Create a dedicated test IWO
    testIwo = await IWO.create({
      iwo_no: '000999/VELO/IWO/X/26',
      request_date: new Date(),
      request_type: 'NEW_INSTALLATION',
      customer_id: testCustomer.id,
      service_id: testService.id,
      sales_id: adminUser.id,
      priority: 'NORMAL',
      status: 'ACTIVATION',
      progress: 80,
      deadline_rfs: new Date(Date.now() + 86400000 * 7),
      created_by: adminUser.id,
    });
    assert.ok(testIwo.id);
  });

  it('1. Placeholder Catalog & Whitelist should return categorized fields', () => {
    const catalog = TemplatePlaceholderService.getCatalog();
    assert.ok(catalog.iwo);
    assert.ok(catalog.customer);
    assert.ok(catalog.service);
    assert.ok(catalog.network);
    assert.ok(catalog.bast);
    assert.ok(catalog.acc);
    assert.ok(catalog.sla);

    const whitelist = TemplatePlaceholderService.getWhitelist();
    assert.ok(whitelist.has('iwo.iwo_no'));
    assert.ok(whitelist.has('customer.name'));
    assert.ok(whitelist.has('acc.subscription_number'));
  });

  it('2. Placeholder Validation: Whitelisted placeholders pass', () => {
    const validContent = 'Pelanggan: {{customer.name}}, IWO: {{iwo.iwo_no}}';
    const result = TemplatePlaceholderService.validatePlaceholders(validContent);
    assert.equal(result.isValid, true);
    assert.equal(result.errors.length, 0);
  });

  it('3. Placeholder Validation: Invalid placeholder detection and recommendation', () => {
    const invalidContent = 'Pelanggan: {{customer.company_names}}, Layanan: {{invalid.field}}';
    const result = TemplatePlaceholderService.validatePlaceholders(invalidContent);
    assert.equal(result.isValid, false);
    assert.ok(result.errors.length >= 2);
    assert.ok(result.errors.some((e) => e.includes('company_names') && e.includes('customer.name')));
  });

  it('4. Create BAST Template with initial DRAFT version', async () => {
    const tmpl = await DocumentTemplateService.create({
      document_type: 'BAST',
      code: 'BAST-TEST-ENTERPRISE',
      name: 'BAST Enterprise Custom',
      description: 'Template BAST khusus pelanggan enterprise',
      version: '1.0',
    }, adminUser.id);

    assert.ok(tmpl.id);
    assert.equal(tmpl.code, 'BAST-TEST-ENTERPRISE');
    assert.equal(tmpl.versions.length, 1);
    assert.equal(tmpl.versions[0].version, '1.0');
    assert.equal(tmpl.versions[0].status, 'DRAFT');
  });

  it('5. Create ACC Template with initial DRAFT version', async () => {
    const tmpl = await DocumentTemplateService.create({
      document_type: 'ACC',
      code: 'ACC-TEST-BROADBAND',
      name: 'ACC Broadband Standard',
      description: 'Template ACC khusus paket broadband',
      version: '1.0',
    }, adminUser.id);

    assert.ok(tmpl.id);
    assert.equal(tmpl.code, 'ACC-TEST-BROADBAND');
    assert.equal(tmpl.versions[0].status, 'DRAFT');
  });

  it('6. Edit DRAFT version content', async () => {
    const tmpl = await DocumentTemplate.findOne({ where: { code: 'BAST-TEST-ENTERPRISE' } });
    const version = await DocumentVersion.findOne({
      where: { document_template_id: tmpl.id, version: '1.0' },
    });

    const updatedSchema = {
      sections: [
        {
          type: 'body',
          components: [
            { type: 'heading', text: 'BERITA ACARA ENTERPRISE', level: 1 },
            { type: 'field_pair', label: 'No. IWO', value: '{{iwo.iwo_no}}' },
            { type: 'field_pair', label: 'Klien', value: '{{customer.name}}' },
          ],
        },
      ],
    };

    const updated = await DocumentTemplateService.updateVersionContent(
      tmpl.id,
      version.id,
      updatedSchema,
      adminUser.id
    );

    assert.ok(updated.content.includes('BERITA ACARA ENTERPRISE'));
  });

  it('7. Activate version and verify other versions are not active', async () => {
    const tmpl = await DocumentTemplate.findOne({ where: { code: 'BAST-TEST-ENTERPRISE' } });
    const version = await DocumentVersion.findOne({
      where: { document_template_id: tmpl.id, version: '1.0' },
    });

    const activated = await DocumentTemplateService.activateVersion(tmpl.id, version.id, adminUser.id);
    assert.equal(activated.status, 'ACTIVE');
    assert.ok(activated.activated_at);

    // Cannot edit ACTIVE version directly
    let threw = false;
    try {
      await DocumentTemplateService.updateVersionContent(tmpl.id, version.id, {}, adminUser.id);
    } catch (err) {
      threw = true;
      assert.ok(err.message && err.message.includes('Only DRAFT versions can be edited'));
    }
    assert.equal(threw, true, 'Editing active version must throw an error');
  });

  it('8. Create New Version (v1.1) from active version', async () => {
    const tmpl = await DocumentTemplate.findOne({ where: { code: 'BAST-TEST-ENTERPRISE' } });
    const v1 = await DocumentVersion.findOne({
      where: { document_template_id: tmpl.id, version: '1.0' },
    });

    const v11 = await DocumentTemplateService.createVersion(
      tmpl.id,
      { version: '1.1', base_version_id: v1.id },
      adminUser.id
    );

    assert.equal(v11.version, '1.1');
    assert.equal(v11.status, 'DRAFT');

    // Historical v1.0 remains intact and ACTIVE
    const reloadedV1 = await DocumentVersion.findByPk(v1.id);
    assert.equal(reloadedV1.status, 'ACTIVE');
    assert.equal(reloadedV1.version, '1.0');
  });

  it('9. Duplicate Template: Creates clone with new code and DRAFT v1.0', async () => {
    const tmpl = await DocumentTemplate.findOne({ where: { code: 'BAST-TEST-ENTERPRISE' } });
    const duplicate = await DocumentTemplateService.duplicate(
      tmpl.id,
      { name: 'BAST Enterprise VIP Customer', code: 'BAST-ENTERPRISE-VIP' },
      adminUser.id
    );

    assert.equal(duplicate.code, 'BAST-ENTERPRISE-VIP');
    assert.equal(duplicate.document_type, 'BAST');
    assert.equal(duplicate.versions.length, 1);
    assert.equal(duplicate.versions[0].status, 'DRAFT');
  });

  it('10. Set as Default Template: Only one default per document type', async () => {
    const tmpl = await DocumentTemplate.findOne({ where: { code: 'BAST-TEST-ENTERPRISE' } });
    await DocumentTemplateService.setDefault(tmpl.id, adminUser.id);

    const reloaded = await DocumentTemplate.findByPk(tmpl.id);
    assert.equal(reloaded.is_default, true);

    const oldDefault = await DocumentTemplate.findOne({ where: { code: 'BAST-DEFAULT' } });
    assert.equal(oldDefault.is_default, false);

    // Restore BAST-DEFAULT as default
    await DocumentTemplateService.setDefault(oldDefault.id, adminUser.id);
    const restored = await DocumentTemplate.findByPk(oldDefault.id);
    assert.equal(restored.is_default, true);
  });

  it('11. Sample Preview rendering works without modifying real data', async () => {
    const sampleData = DocumentRenderService.getSampleData('BAST');
    assert.equal(sampleData._isSample, true);
    assert.ok(sampleData.customer.name);

    // Use the canonical BAST_CONTENT directly to avoid dependency on DB active version state
    const html = DocumentRenderService.renderTemplateHtml(BAST_CONTENT, sampleData);
    assert.ok(html.includes('SAMPLE PREVIEW DATA'));
    assert.ok(html.includes(sampleData.iwo.iwo_no));
    assert.ok(html.includes(sampleData.customer.name));
  });

  it('12. CRITICAL TEST: Immutable Historical Versions & BAST Generation Reproducibility', async () => {
    // 1. Create a dedicated test template to ensure complete isolation
    const immutTemplate = await DocumentTemplateService.create({
      document_type: 'BAST',
      code: 'BAST-TEST-IMMUTABLE-TMPL',
      name: 'BAST Immutable Verification Template',
      description: 'Template for verifying version reproducibility',
      version: '1.0',
    }, adminUser.id);

    const version1 = immutTemplate.versions[0];
    await DocumentTemplateService.activateVersion(immutTemplate.id, version1.id, adminUser.id);

    // 2. Create a BAST record
    const bast = await BAST.create({
      iwo_id: testIwo.id,
      bast_no: `BAST-IMMUT-${Date.now()}`,
      active_date: '2026-10-26',
      status: 'APPROVED',
      created_by: adminUser.id,
    });

    // 3. Generate BAST using version 1.0
    const genResult = await DocumentRenderService.generateBASTDocument(bast.id, version1.id, adminUser.id);
    assert.ok(genResult.success);
    assert.equal(genResult.template_version, '1.0');

    const reloadedBast = await BAST.findByPk(bast.id);
    assert.equal(reloadedBast.template_version_id, version1.id);
    assert.equal(reloadedBast.generated_document_version, '1.0');
    assert.equal(reloadedBast.status, 'GENERATED');

    // 4. Administrator creates version 2.0 and activates it
    const version2 = await DocumentTemplateService.createVersion(
      immutTemplate.id,
      {
        version: '2.0',
        content: JSON.stringify({
          sections: [
            {
              type: 'header',
              components: [{ type: 'heading', text: 'BERITA ACARA V2 REVISED', level: 1 }],
            },
          ],
        }),
      },
      adminUser.id
    );
    await DocumentTemplateService.activateVersion(immutTemplate.id, version2.id, adminUser.id);

    // 5. Verify the previously generated BAST STILL references version 1.0 and NOT version 2.0!
    const historicalBast = await BAST.findByPk(bast.id);
    assert.equal(historicalBast.template_version_id, version1.id);
    assert.equal(historicalBast.generated_document_version, '1.0');

    // The historical document version 1.0 remains preserved in the database
    const v1InDb = await DocumentVersion.findByPk(version1.id);
    assert.ok(v1InDb);
    assert.equal(v1InDb.version, '1.0');
    assert.equal(v1InDb.status, 'INACTIVE'); // Replaced by v2.0 as active, but data preserved

    // Cleanup
    // Must clean Attachment records (FK template_version_id -> document_versions) before destroying versions
    await Attachment.destroy({ where: { entity_id: bast.id } });
    await bast.destroy();
    // Null out FK references before deleting versions (SQLite FK constraint)
    await BAST.update({ template_version_id: null, document_template_id: null }, { where: { document_template_id: immutTemplate.id } });
    await Attachment.destroy({ where: { document_template_id: immutTemplate.id } });
    await DocumentVersion.destroy({ where: { document_template_id: immutTemplate.id } });
    await immutTemplate.destroy();
  });

  it('13. CRITICAL TEST: ACC Generation & Version Association', async () => {
    // 1. Create ACC record
    const acc = await ACC.create({
      iwo_id: testIwo.id,
      subscription_number: 'SUB-ACC-TEST-001',
      contract_number: 'CTR-ACC-TEST-001',
      activation_date: '2026-10-26',
      start_billing_date: '2026-11-01',
      monthly_tariff: 10000000,
      contract_period: 12,
      status: 'DRAFT',
      created_by: adminUser.id,
    });

    const accTmpl = await DocumentTemplate.findOne({ where: { code: 'ACC-DEFAULT' } });
    const accVersion = await DocumentVersion.findOne({
      where: { document_template_id: accTmpl.id, version: '1.0' },
    });

    // 2. Generate ACC Document
    const result = await DocumentRenderService.generateACCDocument(acc.id, accVersion.id, adminUser.id);
    assert.ok(result.success);
    assert.equal(result.template_version, '1.0');

    const reloadedAcc = await ACC.findByPk(acc.id);
    assert.equal(reloadedAcc.template_version_id, accVersion.id);
    assert.equal(reloadedAcc.generated_document_version, '1.0');
    assert.ok(reloadedAcc.pdf_path);
  });

  it('14. Audit Log Records: Template actions logged with actor and entity', async () => {
    const logs = await AuditLog.findAll({
      where: { entity_type: 'DocumentTemplate' },
    });
    assert.ok(logs.length > 0, 'Audit logs must be present for template operations');
    const actions = logs.map((l) => l.action);
    assert.ok(actions.includes('TEMPLATE_CREATED'));
    assert.ok(actions.includes('TEMPLATE_SET_DEFAULT') || actions.includes('TEMPLATE_DUPLICATED'));
  });
});
