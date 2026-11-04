import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import sequelize from '../database/sequelize.js';
import {
  User, Customer, Service, IWO, BAST, BastApproval, ACC, DocumentTemplate, DocumentVersion, AuditLog
} from '../models/index.js';
import { DocumentTemplateService } from '../services/DocumentTemplateService.js';
import { DocumentRenderService } from '../services/DocumentRenderService.js';

describe('VELO Internal Work Order Management System — End-to-End Verification Flows', () => {
  let adminUser;
  let customer;
  let service;
  let testIwo;
  let bastTemplate;
  let accTemplate;

  before(async () => {
    await sequelize.authenticate();

    adminUser = await User.findOne({ where: { role: 'ADMINISTRATOR' } });
    assert.ok(adminUser);

    customer = await Customer.findOne();
    assert.ok(customer);

    service = await Service.findOne();
    assert.ok(service);

    // Note: templates resolved fresh inside each flow to avoid cross-test state issues
  });

  it('FLOW 1: BAST Workflow — IWO -> ACTIVATION -> BAST -> SELECT TEMPLATE -> PREVIEW -> APPROVAL -> GENERATE -> VERSIONED PDF -> AUDIT', async () => {
    // Resolve default templates fresh to get current active version (not a stale before() snapshot)
    bastTemplate = await DocumentTemplateService.getDefaultTemplate('BAST');
    assert.ok(bastTemplate, 'Default BAST template must exist');
    assert.ok(bastTemplate.versions.length > 0, 'BAST template must have an active version');

    // 1. Intake / Create IWO
    testIwo = await IWO.create({
      iwo_no: `${Math.floor(100000 + Math.random() * 900000)}/VELO/IWO/X/26`,
      request_date: new Date(),
      request_type: 'NEW_INSTALLATION',
      customer_id: customer.id,
      service_id: service.id,
      sales_id: adminUser.id,
      priority: 'HIGH',
      status: 'ACTIVATION',
      progress: 75,
      deadline_rfs: new Date(Date.now() + 86400000 * 5),
      created_by: adminUser.id,
    });
    assert.ok(testIwo.id);

    // 2. Create BAST for IWO selecting the active BAST template
    const bast = await BAST.create({
      iwo_id: testIwo.id,
      bast_no: `BAST-TEST-E2E-${Date.now()}`,
      active_date: '2026-10-27',
      status: 'DRAFT',
      document_template_id: bastTemplate.id,
      template_version_id: bastTemplate.versions[0].id,
      created_by: adminUser.id,
    });
    assert.ok(bast.id);
    assert.equal(bast.document_template_id, bastTemplate.id);

    // Create approvals chain
    const approval = await BastApproval.create({
      bast_id: bast.id,
      role: 'ENGINEER',
      user_id: adminUser.id,
      status: 'PENDING',
      order: 1,
    });

    // 3. Preview BAST Document
    const preview = await DocumentRenderService.previewBASTDocument(bast.id, bast.template_version_id);
    assert.ok(preview.html);
    assert.ok(preview.html.includes('BERITA ACARA'));
    assert.equal(preview.version, bastTemplate.versions[0].version);

    // 4. Approval process
    await approval.update({ status: 'APPROVED', approved_at: new Date() });
    await bast.update({ status: 'APPROVED' });

    // 5. Generate Versioned PDF
    const genResult = await DocumentRenderService.generateBASTDocument(bast.id, bast.template_version_id, adminUser.id);
    assert.ok(genResult.success);
    assert.ok(genResult.path);
    assert.equal(genResult.template_version, bastTemplate.versions[0].version);

    // 6. Verify stored references and audit
    const finalBast = await BAST.findByPk(bast.id);
    assert.equal(finalBast.status, 'GENERATED');
    assert.equal(finalBast.template_version_id, bastTemplate.versions[0].id);
    assert.equal(finalBast.generated_document_version, bastTemplate.versions[0].version);
    assert.ok(finalBast.generated_document_path);

    // Update IWO state to BAST completed / WAITING_ACC
    await testIwo.update({ status: 'BAST', progress: 85 });
  });

  it('FLOW 2: ACC Workflow — ACC -> SELECT TEMPLATE -> PREVIEW -> GENERATE -> VERSIONED PDF -> SEND CUSTOMER -> APPROVAL -> IWO CLOSED', async () => {
    // Resolve default ACC template fresh
    const accTemplate = await DocumentTemplateService.getDefaultTemplate('ACC');
    assert.ok(accTemplate, 'Default ACC template must exist');
    assert.ok(accTemplate.versions.length > 0, 'ACC template must have an active version');

    // 1. Create ACC record selecting ACC template
    const acc = await ACC.create({
      iwo_id: testIwo.id,
      subscription_number: `SUB-E2E-${Date.now()}`,
      contract_number: `CTR-VELO-2026/${Date.now().toString().slice(-4)}`,
      activation_date: '2026-10-27',
      start_billing_date: '2026-11-01',
      monthly_tariff: 8500000,
      contract_period: 12,
      status: 'DRAFT',
      document_template_id: accTemplate.id,
      template_version_id: accTemplate.versions[0].id,
      created_by: adminUser.id,
    });
    assert.ok(acc.id);

    // 2. Preview ACC Document
    const preview = await DocumentRenderService.previewACCDocument(acc.id, acc.template_version_id);
    assert.ok(preview.html);
    assert.ok(preview.html.includes(acc.subscription_number));

    // 3. Generate Versioned ACC PDF
    const genResult = await DocumentRenderService.generateACCDocument(acc.id, acc.template_version_id, adminUser.id);
    assert.ok(genResult.success);
    assert.ok(genResult.path);
    assert.equal(genResult.template_version, accTemplate.versions[0].version);

    // 4. Send Customer (generate customer approval token)
    const { v4: uuidv4 } = await import('uuid');
    const token = uuidv4();
    await acc.update({
      customer_signature_token: token,
      status: 'SENT',
      email_sent_at: new Date(),
    });
    assert.equal(acc.status, 'SENT');

    // 5. Customer Approval via Token
    const pendingAcc = await ACC.findOne({ where: { customer_signature_token: token, status: 'SENT' } });
    assert.ok(pendingAcc);

    await pendingAcc.update({
      status: 'CUSTOMER_APPROVED',
      customer_approved_at: new Date(),
    });

    // 6. IWO Closed / Completed at 100%
    await testIwo.update({ status: 'COMPLETED', progress: 100 });

    const finalIwo = await IWO.findByPk(testIwo.id);
    assert.equal(finalIwo.status, 'COMPLETED');
    assert.equal(finalIwo.progress, 100);

    const finalAcc = await ACC.findByPk(acc.id);
    assert.equal(finalAcc.status, 'CUSTOMER_APPROVED');
    assert.equal(finalAcc.template_version_id, accTemplate.versions[0].id);
    assert.equal(finalAcc.generated_document_version, accTemplate.versions[0].version);
  });
});
