import path from 'path';
import fs from 'fs/promises';
import Handlebars from 'handlebars';
import {
  IWO, BAST, ACC, Customer, Service, User, NetworkInfo, SlaInfo, Device,
  AccEquipment, AccRequirement, BastApproval, DocumentVersion, DocumentTemplate, Attachment
} from '../models/index.js';
import { TemplatePlaceholderService } from './TemplatePlaceholderService.js';
import { logAudit } from '../utils/auditLogger.js';

Handlebars.registerHelper('eq', (a, b) => a === b);
Handlebars.registerHelper('formatDate', (value) => {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return String(value);
  }
});
Handlebars.registerHelper('currency', (value) => {
  if (value === null || value === undefined || value === '') return '-';
  try {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(value);
  } catch {
    return String(value);
  }
});

export class DocumentRenderService {
  /**
   * Sample data used for template preview design when no real record is selected.
   */
  static getSampleData(entityType) {
    const isBast = entityType === 'BAST';
    return {
      _isSample: true,
      iwo: {
        iwo_no: '000125/VELO/IWO/X/26',
        request_date: '2026-10-15',
        request_type: 'NEW DEDICATED',
        deadline_rfs: '2026-10-30',
        priority: 'HIGH',
        status: isBast ? 'BAST' : 'ACC',
        progress: 90,
        notes: 'Pemasangan baru koneksi Dedicated 100 Mbps Kantor Pusat',
      },
      customer: {
        name: 'PT Contoh Mahakarya Gemilang',
        code: 'CUST-DEMO-01',
        address: 'Jl. Sudirman Kav 50, Gedung Millennium Lt. 15, Jakarta Pusat',
        contact_name: 'Bpk. Hendra Gunawan',
        email: 'hendra@contohmahakarya.co.id',
        phone: '021-5558899',
      },
      service: {
        name: 'Dedicated Internet Access 100 Mbps 1:1',
        price: 12000000,
        description: 'Internet Dedicated 100 Mbps Simetris SLA 99.8%',
      },
      sales: {
        name: 'Andi Pratama',
        email: 'andi.sales@velo.co.id',
        phone: '081234567890',
      },
      network: {
        node_pop: 'POP-CYBER-01',
        connection_type: 'Fiber Optic Direct',
        pop_switch: 'SW-CYB-DIST-02',
        switch_port: 'Gi1/0/24',
        router: 'MikroTik CCR2004-16G-2S+',
        wan_ip: '103.145.88.10/30',
        public_ip: '103.145.88.11',
        partner: 'Telkom Indonesia',
        port: 'Port-12',
        vlan: '2150',
      },
      sla: {
        availability: '99.8%',
        bandwidth_guarantee: '100% Committed 1:1',
        customer_support_response: '< 15 Menit',
        hotline: '021-8000-VELO (8356)',
        email: 'support@velo.co.id',
        whatsapp: '+62 811-9876-5432',
      },
      devices: [
        { name: 'Router MikroTik', description: 'CCR2004-16G-2S+', serial_number: 'CCR-987654321', quantity: 1, location: 'Server Rack 01' },
        { name: 'SFP+ BIDI Transceiver', description: '10G 20km Single-Mode', serial_number: 'SFP-10G-20K-01', quantity: 1, location: 'Port SFP1' },
        { name: 'Patch Cord FO', description: 'LC-LC Duplex 5m', serial_number: '-', quantity: 2, location: 'Rack 01 to OTB' },
      ],
      bast: {
        bast_no: 'BAST-000125/VELO/X/26',
        active_date: '2026-10-25',
        status: 'APPROVED',
        notes: 'Semua perangkat dan layanan telah diuji dan berfungsi normal.',
      },
      approval: {
        engineer_name: 'Budi Santoso (Lead Engineer)',
        sales_name: 'Andi Pratama (Account Manager)',
        fulfilment_name: 'Dewi Lestari (Fulfilment)',
        manager_mon_name: 'Reza Fahmi (Manager Monitoring)',
        manager_industry_name: 'Irwan Setiawan (Manager Industry)',
        head_oss_name: 'Ivan Naga (Head of OSS)',
      },
      acc: {
        subscription_number: 'SUB-2026-10-00125',
        contract_number: 'CTR-VELO-2026/089',
        customer_id: 'CUST-DEMO-01',
        service_id: 'SVC-DIA-100',
        product_id: 'PRD-DIA',
        activation_date: '2026-10-25',
        start_billing_date: '2026-11-01',
        monthly_tariff: 12000000,
        contract_period: 12,
      },
      equipments: [
        { name: 'Router Gateway MikroTik CCR2004', description: 'Perangkat CPE Utama', serial_number: 'CCR-987654321', quantity: 1, location: 'Rak Server Lt. 15' },
        { name: 'Optical Network Terminal', description: 'Modem FO Bridge', serial_number: 'ONT-55443322', quantity: 1, location: 'Ruang Server' },
      ],
      requirements: [
        { requirement: 'Konektivitas Internet berfungsi stabil', result: 'YES', notes: 'Latency < 5ms ke IIX Gateway' },
        { requirement: 'Throughput bandwidth mencapai 100 Mbps sesuai kontrak', result: 'YES', notes: 'Speedtest: 98.4 Mbps DL / 99.1 Mbps UL' },
        { requirement: 'Perangkat dalam kondisi baru dan beroperasi optimal', result: 'YES', notes: 'Status LED hijau normal' },
        { requirement: 'Konfigurasi IP Public telah terpasang di router klien', result: 'YES', notes: 'IP 103.145.88.11 resolve' },
      ],
    };
  }

  /**
   * Build render data from real entities.
   */
  static async buildRenderData(entityType, entityId) {
    if (entityType === 'BAST') {
      const bast = await BAST.findByPk(entityId, {
        include: [
          {
            model: IWO,
            as: 'iwo',
            include: [
              { model: Customer, as: 'customer' },
              { model: Service, as: 'service' },
              { model: User, as: 'sales' },
              { model: User, as: 'engineer' },
              { model: NetworkInfo, as: 'networkInfo' },
              { model: SlaInfo, as: 'slaInfo' },
              { model: Device, as: 'devices' },
            ],
          },
          {
            model: BastApproval,
            as: 'approvals',
            include: [{ model: User, as: 'approver' }],
          },
        ],
      });

      if (!bast) throw { status: 404, message: 'BAST not found' };

      const iwo = bast.iwo;
      const customer = iwo?.customer;
      const service = iwo?.service;
      const sales = iwo?.sales;
      const engineer = iwo?.engineer;
      const network = iwo?.networkInfo;
      const sla = iwo?.slaInfo;
      const devices = iwo?.devices || [];

      const approvalsMap = {};
      (bast.approvals || []).forEach((a) => {
        approvalsMap[a.role.toLowerCase() + '_name'] = a.approver?.name || `${a.role} (${a.status})`;
      });

      return {
        bast: {
          bast_no: bast.bast_no,
          active_date: bast.active_date,
          status: bast.status,
          notes: bast.notes,
        },
        iwo: {
          iwo_no: iwo?.iwo_no,
          request_date: iwo?.request_date,
          request_type: iwo?.request_type,
          deadline_rfs: iwo?.deadline_rfs,
          priority: iwo?.priority,
          status: iwo?.status,
          progress: iwo?.progress,
          notes: iwo?.notes,
        },
        customer: {
          name: iwo?.customer_name_manual || customer?.name,
          code: customer?.code || '-',
          address: iwo?.customer_address_manual || customer?.address,
          contact_name: iwo?.customer_contact_person || customer?.contact_name,
          email: iwo?.customer_email || customer?.email,
          phone: iwo?.customer_phone || customer?.phone,
        },
        service: {
          name: iwo?.service_name_manual || service?.name,
          price: service?.price,
          description: service?.description,
        },
        sales: {
          name: iwo?.sales_name_manual || sales?.name,
          email: sales?.email,
          phone: sales?.phone,
        },
        network: {
          node_pop: network?.node_pop,
          connection_type: network?.connection_type,
          pop_switch: network?.pop_switch,
          switch_port: network?.switch_port,
          router: network?.router,
          wan_ip: network?.wan_ip,
          public_ip: network?.public_ip,
          partner: network?.partner,
          port: network?.port,
          vlan: network?.vlan,
        },
        sla: {
          availability: sla?.availability,
          bandwidth_guarantee: sla?.bandwidth_guarantee,
          customer_support_response: sla?.customer_support_response,
          hotline: sla?.hotline,
          email: sla?.email,
          whatsapp: sla?.whatsapp,
        },
        devices: devices.map((d) => ({
          name: d.name,
          description: d.description,
          serial_number: d.serial_number,
          quantity: d.quantity,
          location: d.location,
        })),
        approval: {
          engineer_name: approvalsMap.engineer_name || engineer?.name || 'Engineer',
          sales_name: approvalsMap.sales_name || sales?.name || 'Sales',
          fulfilment_name: approvalsMap.fulfilment_name || 'Fulfilment Team',
          manager_mon_name: approvalsMap.manager_mon_name || 'Manager Monitoring',
          manager_industry_name: approvalsMap.manager_industry_name || 'Manager Industry',
          head_oss_name: approvalsMap.head_oss_name || 'Head of OSS',
        },
      };
    } else if (entityType === 'ACC') {
      const acc = await ACC.findByPk(entityId, {
        include: [
          {
            model: IWO,
            as: 'iwo',
            include: [
              { model: Customer, as: 'customer' },
              { model: Service, as: 'service' },
              { model: User, as: 'sales' },
              { model: SlaInfo, as: 'slaInfo' },
            ],
          },
          { model: AccEquipment, as: 'equipments' },
          { model: AccRequirement, as: 'requirements' },
        ],
      });

      if (!acc) throw { status: 404, message: 'ACC not found' };

      const iwo = acc.iwo;
      const customer = iwo?.customer;
      const service = iwo?.service;
      const sales = iwo?.sales;
      const sla = iwo?.slaInfo;

      return {
        acc: {
          subscription_number: acc.subscription_number,
          contract_number: acc.contract_number,
          customer_id: acc.customer_id_ext || customer?.code,
          service_id: acc.service_id_ext || service?.id,
          product_id: acc.product_id_ext || 'PRD-INTERNET',
          activation_date: acc.activation_date,
          start_billing_date: acc.start_billing_date,
          monthly_tariff: acc.monthly_tariff,
          contract_period: acc.contract_period,
          status: acc.status,
        },
        iwo: {
          iwo_no: iwo?.iwo_no,
          request_date: iwo?.request_date,
          request_type: iwo?.request_type,
          deadline_rfs: iwo?.deadline_rfs,
          priority: iwo?.priority,
          status: iwo?.status,
          progress: iwo?.progress,
          notes: iwo?.notes,
        },
        customer: {
          name: iwo?.customer_name_manual || customer?.name,
          code: customer?.code || '-',
          address: iwo?.customer_address_manual || customer?.address,
          contact_name: iwo?.customer_contact_person || customer?.contact_name,
          email: iwo?.customer_email || customer?.email,
          phone: iwo?.customer_phone || customer?.phone,
        },
        service: {
          name: iwo?.service_name_manual || service?.name,
          price: service?.price,
          description: service?.description,
        },
        sales: {
          name: iwo?.sales_name_manual || sales?.name,
          email: sales?.email,
          phone: sales?.phone,
        },
        sla: {
          availability: sla?.availability,
          bandwidth_guarantee: sla?.bandwidth_guarantee,
          customer_support_response: sla?.customer_support_response,
          hotline: sla?.hotline,
          email: sla?.email,
          whatsapp: sla?.whatsapp,
        },
        equipments: (acc.equipments || []).map((e) => ({
          name: e.name,
          description: e.description,
          serial_number: e.serial_number,
          quantity: e.quantity,
          location: e.location,
        })),
        requirements: (acc.requirements || []).map((r) => ({
          requirement: r.requirement,
          result: r.result,
          evidence_url: r.evidence_url,
          notes: r.notes,
        })),
      };
    }

    throw { status: 400, message: `Unsupported entity type: ${entityType}` };
  }

  /**
   * Render template JSON schema into styled HTML.
   */
  static renderTemplateHtml(content, renderData) {
    let schema = content;
    if (typeof content === 'string') {
      try {
        schema = JSON.parse(content);
      } catch {
        // Plain HTML string
        return DocumentRenderService.renderRawHtml(content, renderData);
      }
    }

    if (!schema || !schema.sections) {
      return `<div class="p-6 text-gray-500">Empty template</div>`;
    }

    const isSample = renderData._isSample;
    const sampleBanner = isSample
      ? `<div style="background:#fef3c7; border:1px solid #f59e0b; color:#92400e; padding:10px 16px; margin-bottom:16px; border-radius:6px; font-weight:bold; text-align:center;">
          ⚠️ SAMPLE PREVIEW DATA — Data ini hanya simulasi untuk desain template.
        </div>`
      : '';

    let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Document</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; background: #fff; margin: 0; padding: 30px; font-size: 13px; line-height: 1.5; }
    .doc-container { max-width: 800px; margin: 0 auto; background: #fff; }
    .header-box { border-bottom: 2px solid #2563eb; padding-bottom: 15px; margin-bottom: 20px; text-align: center; }
    h1 { margin: 0 0 6px 0; font-size: 20px; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }
    h2 { margin: 0 0 4px 0; font-size: 15px; color: #2563eb; }
    h3 { margin: 16px 0 8px 0; font-size: 14px; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; font-weight: 600; }
    p { margin: 4px 0; color: #475569; }
    .field-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 24px; margin-bottom: 12px; }
    .field-row { display: flex; font-size: 12.5px; padding: 3px 0; }
    .field-label { width: 140px; font-weight: 500; color: #64748b; flex-shrink: 0; }
    .field-colon { width: 15px; text-align: center; color: #94a3b8; }
    .field-value { flex: 1; color: #0f172a; font-weight: 500; word-break: break-word; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 12px; }
    th { background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; font-weight: 600; color: #334155; }
    td { border: 1px solid #cbd5e1; padding: 6px 10px; color: #1e293b; }
    tr:nth-child(even) td { background: #f8fafc; }
    .divider { border-top: 1px dashed #cbd5e1; margin: 16px 0; }
    .approval-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; margin-top: 20px; }
    .approval-card { border: 1px solid #cbd5e1; border-radius: 4px; padding: 8px; text-align: center; background: #fafafa; }
    .approval-role { font-size: 11px; font-weight: 600; color: #475569; margin-bottom: 35px; }
    .approval-name { font-size: 11px; font-weight: 500; color: #0f172a; border-top: 1px solid #94a3b8; padding-top: 4px; }
    .status-badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold; }
    .badge-yes { background: #dcfce7; color: #15803d; }
    .badge-no { background: #fee2e2; color: #b91c1c; }
    .badge-na { background: #f1f5f9; color: #475569; }
    @media print { body { padding: 0; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="doc-container">
    ${sampleBanner}
`;

    for (const section of schema.sections || []) {
      html += `<div class="doc-section doc-section-${section.type}">`;
      for (const comp of section.components || []) {
        html += DocumentRenderService.renderComponent(comp, renderData);
      }
      html += `</div>`;
    }

    html += `
  </div>
</body>
</html>`;

    return html;
  }

  static renderComponent(comp, renderData) {
    switch (comp.type) {
      case 'heading': {
        const text = TemplatePlaceholderService.resolvePlaceholders(comp.text || '', renderData);
        const level = comp.level || 2;
        return `<h${level}>${text}</h${level}>`;
      }
      case 'paragraph': {
        const text = TemplatePlaceholderService.resolvePlaceholders(comp.text || '', renderData);
        return `<p>${text}</p>`;
      }
      case 'field_pair': {
        const val = TemplatePlaceholderService.resolvePlaceholders(comp.value || '', renderData);
        return `<div class="field-row">
          <span class="field-label">${comp.label || ''}</span>
          <span class="field-colon">:</span>
          <span class="field-value">${val || '-'}</span>
        </div>`;
      }
      case 'divider': {
        return `<div class="divider"></div>`;
      }
      case 'dynamic_table': {
        const source = comp.source || 'devices';
        const rows = Array.isArray(renderData[source]) ? renderData[source] : [];
        const columns = comp.columns || ['name', 'description', 'serial_number', 'quantity', 'location'];

        const colLabels = {
          name: 'Nama Perangkat',
          description: 'Spesifikasi / Deskripsi',
          serial_number: 'Serial Number',
          quantity: 'Jumlah',
          location: 'Lokasi / Posisi',
        };

        let tHtml = `<table><thead><tr>`;
        columns.forEach((c) => {
          tHtml += `<th>${colLabels[c] || c}</th>`;
        });
        tHtml += `</tr></thead><tbody>`;

        if (rows.length === 0) {
          tHtml += `<tr><td colspan="${columns.length}" style="text-align:center; color:#94a3b8; padding:12px;">Tidak ada data perangkat</td></tr>`;
        } else {
          rows.forEach((r) => {
            tHtml += `<tr>`;
            columns.forEach((c) => {
              tHtml += `<td>${r[c] !== undefined && r[c] !== null ? r[c] : '-'}</td>`;
            });
            tHtml += `</tr>`;
          });
        }
        tHtml += `</tbody></table>`;
        return tHtml;
      }
      case 'requirements_table': {
        const rows = Array.isArray(renderData.requirements) ? renderData.requirements : [];
        let tHtml = `<table><thead><tr>
          <th style="width:50%;">Kriteria / Syarat</th>
          <th style="width:15%; text-align:center;">Hasil</th>
          <th style="width:35%;">Catatan / Evidence</th>
        </tr></thead><tbody>`;

        if (rows.length === 0) {
          tHtml += `<tr><td colspan="3" style="text-align:center; color:#94a3b8; padding:12px;">Tidak ada kriteria</td></tr>`;
        } else {
          rows.forEach((r) => {
            const badgeClass = r.result === 'YES' ? 'badge-yes' : r.result === 'NO' ? 'badge-no' : 'badge-na';
            tHtml += `<tr>
              <td>${r.requirement || '-'}</td>
              <td style="text-align:center;"><span class="status-badge ${badgeClass}">${r.result || 'N/A'}</span></td>
              <td>${r.notes || (r.evidence_url ? `<a href="${r.evidence_url}" target="_blank">Lihat Evidence</a>` : '-')}</td>
            </tr>`;
          });
        }
        tHtml += `</tbody></table>`;
        return tHtml;
      }
      case 'approval_block': {
        const roles = comp.roles || ['ENGINEER', 'SALES', 'FULFILMENT', 'MANAGER_MON', 'HEAD_OSS'];
        const roleLabels = {
          ENGINEER: 'Lead Engineer',
          SALES: 'Sales PIC',
          FULFILMENT: 'Fulfilment',
          MANAGER_MON: 'Manager Monitoring',
          MANAGER_INDUSTRY: 'Manager Industry',
          HEAD_OSS: 'Head of OSS',
        };

        let aHtml = `<div class="approval-grid">`;
        roles.forEach((r) => {
          const key = r.toLowerCase() + '_name';
          const name = renderData.approval?.[key] || '-';
          aHtml += `<div class="approval-card">
            <div class="approval-role">${roleLabels[r] || r}</div>
            <div class="approval-name">${name}</div>
          </div>`;
        });
        aHtml += `</div>`;
        return aHtml;
      }
      case 'customer_approval_block': {
        return `<div style="margin-top:20px; border:1px solid #cbd5e1; border-radius:6px; padding:14px; background:#f8fafc;">
          <p style="font-weight:600; margin-bottom:8px;">Persetujuan Pelanggan:</p>
          <p style="font-size:12px; color:#475569;">${comp.notes || 'Dengan ini pelanggan menyatakan layanan dan perangkat telah diterima dalam kondisi baik dan berfungsi normal.'}</p>
          <div style="margin-top:25px; display:flex; justify-content:space-between; padding:0 30px;">
            <div style="text-align:center;">
              <p style="font-size:11px; color:#64748b; margin-bottom:40px;">Diserahkan oleh, PT VELO</p>
              <p style="font-weight:600; border-top:1px solid #94a3b8; padding-top:4px;">( ${renderData.sales?.name || 'Account Manager'} )</p>
            </div>
            <div style="text-align:center;">
              <p style="font-size:11px; color:#64748b; margin-bottom:40px;">Diterima & Disetujui oleh Pelanggan</p>
              <p style="font-weight:600; border-top:1px solid #94a3b8; padding-top:4px;">( ${renderData.customer?.contact_name || 'Penanggung Jawab'} )</p>
            </div>
          </div>
        </div>`;
      }
      default:
        return '';
    }
  }

  static renderRawHtml(htmlString, renderData) {
    const resolved = TemplatePlaceholderService.resolvePlaceholders(htmlString, renderData);
    const compiled = Handlebars.compile(resolved, { noEscape: false });
    return compiled(renderData);
  }

  static async generateBASTDocument(bastId, templateVersionId, actorId) {
    const bast = await BAST.findByPk(bastId);
    if (!bast) throw { status: 404, message: 'BAST not found' };

    let version = null;
    if (templateVersionId) {
      version = await DocumentVersion.findByPk(templateVersionId, {
        include: [{ model: DocumentTemplate, as: 'template' }],
      });
    } else if (bast.template_version_id) {
      version = await DocumentVersion.findByPk(bast.template_version_id, {
        include: [{ model: DocumentTemplate, as: 'template' }],
      });
    }

    if (!version) {
      // Find default active BAST template
      const defaultTmpl = await DocumentTemplate.findOne({
        where: { document_type: 'BAST', is_default: true, is_active: true },
        include: [{ model: DocumentVersion, as: 'versions', where: { status: 'ACTIVE' }, required: false }],
      });
      version = defaultTmpl?.versions?.[0];
    }

    if (!version) throw { status: 400, message: 'No active BAST template version found for generation' };

    const renderData = await DocumentRenderService.buildRenderData('BAST', bastId);
    const html = DocumentRenderService.renderTemplateHtml(version.content, renderData);

    const filename = `BAST_${bast.bast_no.replace(/[/\\?%*:|"<>]/g, '_')}_v${version.version}.html`;
    const storageDir = path.resolve(process.cwd(), 'storage/private/documents/bast');
    await fs.mkdir(storageDir, { recursive: true });
    const fullPath = path.join(storageDir, filename);

    await fs.writeFile(fullPath, html, 'utf-8');

    // Update BAST record
    await bast.update({
      document_template_id: version.document_template_id,
      template_version_id: version.id,
      generated_at: new Date(),
      generated_by: actorId,
      generated_document_path: fullPath,
      generated_document_version: version.version,
      status: 'GENERATED',
    });

    // Create attachment record
    const { v4: uuidv4 } = await import('uuid');
    const attachment = await Attachment.create({
      entity_type: 'BAST',
      entity_id: bast.id,
      filename,
      original_name: filename,
      mime_type: 'text/html',
      size: Buffer.byteLength(html),
      storage_key: `documents/bast/${filename}_${uuidv4()}`,
      document_type: 'BAST',
      document_template_id: version.document_template_id,
      template_version_id: version.id,
      generated_by: actorId,
      generated_at: new Date(),
      is_generated: true,
      is_private: true,
      created_by: actorId,
    });

    return {
      success: true,
      path: fullPath,
      filename,
      attachment_id: attachment.id,
      template_version: version.version,
      html,
    };
  }

  static async previewBASTDocument(bastId, templateVersionId) {
    let version = null;
    if (templateVersionId) {
      version = await DocumentVersion.findByPk(templateVersionId);
    }
    if (!version) {
      const bast = await BAST.findByPk(bastId);
      if (bast?.template_version_id) {
        version = await DocumentVersion.findByPk(bast.template_version_id);
      }
    }
    if (!version) {
      const defaultTmpl = await DocumentTemplate.findOne({
        where: { document_type: 'BAST', is_default: true, is_active: true },
        include: [{ model: DocumentVersion, as: 'versions', where: { status: 'ACTIVE' }, required: false }],
      });
      version = defaultTmpl?.versions?.[0];
    }
    if (!version) throw { status: 404, message: 'Template version not found' };

    const renderData = await DocumentRenderService.buildRenderData('BAST', bastId);
    const html = DocumentRenderService.renderTemplateHtml(version.content, renderData);

    return {
      html,
      version: version.version,
    };
  }

  static async generateACCDocument(accId, templateVersionId, actorId) {
    const acc = await ACC.findByPk(accId);
    if (!acc) throw { status: 404, message: 'ACC not found' };

    let version = null;
    if (templateVersionId) {
      version = await DocumentVersion.findByPk(templateVersionId, {
        include: [{ model: DocumentTemplate, as: 'template' }],
      });
    } else if (acc.template_version_id) {
      version = await DocumentVersion.findByPk(acc.template_version_id, {
        include: [{ model: DocumentTemplate, as: 'template' }],
      });
    }

    if (!version) {
      const defaultTmpl = await DocumentTemplate.findOne({
        where: { document_type: 'ACC', is_default: true, is_active: true },
        include: [{ model: DocumentVersion, as: 'versions', where: { status: 'ACTIVE' }, required: false }],
      });
      version = defaultTmpl?.versions?.[0];
    }

    if (!version) throw { status: 400, message: 'No active ACC template version found for generation' };

    const renderData = await DocumentRenderService.buildRenderData('ACC', accId);
    const html = DocumentRenderService.renderTemplateHtml(version.content, renderData);

    const subNo = acc.subscription_number ? acc.subscription_number.replace(/[/\\?%*:|"<>]/g, '_') : acc.id;
    const filename = `ACC_${subNo}_v${version.version}.html`;
    const storageDir = path.resolve(process.cwd(), 'storage/private/documents/acc');
    await fs.mkdir(storageDir, { recursive: true });
    const fullPath = path.join(storageDir, filename);

    await fs.writeFile(fullPath, html, 'utf-8');

    await acc.update({
      document_template_id: version.document_template_id,
      template_version_id: version.id,
      generated_at: new Date(),
      generated_by: actorId,
      pdf_path: fullPath,
      generated_document_version: version.version,
    });

    const { v4: uuidv4 } = await import('uuid');
    const attachment = await Attachment.create({
      entity_type: 'ACC',
      entity_id: acc.id,
      filename,
      original_name: filename,
      mime_type: 'text/html',
      size: Buffer.byteLength(html),
      storage_key: `documents/acc/${filename}_${uuidv4()}`,
      document_type: 'ACC',
      document_template_id: version.document_template_id,
      template_version_id: version.id,
      generated_by: actorId,
      generated_at: new Date(),
      is_generated: true,
      is_private: true,
      created_by: actorId,
    });

    return {
      success: true,
      path: fullPath,
      filename,
      attachment_id: attachment.id,
      template_version: version.version,
      html,
    };
  }

  static async previewACCDocument(accId, templateVersionId) {
    let version = null;
    if (templateVersionId) {
      version = await DocumentVersion.findByPk(templateVersionId);
    }
    if (!version) {
      const acc = await ACC.findByPk(accId);
      if (acc?.template_version_id) {
        version = await DocumentVersion.findByPk(acc.template_version_id);
      }
    }
    if (!version) {
      const defaultTmpl = await DocumentTemplate.findOne({
        where: { document_type: 'ACC', is_default: true, is_active: true },
        include: [{ model: DocumentVersion, as: 'versions', where: { status: 'ACTIVE' }, required: false }],
      });
      version = defaultTmpl?.versions?.[0];
    }
    if (!version) throw { status: 404, message: 'Template version not found' };

    const renderData = await DocumentRenderService.buildRenderData('ACC', accId);
    const html = DocumentRenderService.renderTemplateHtml(version.content, renderData);

    return {
      html,
      version: version.version,
    };
  }
}
