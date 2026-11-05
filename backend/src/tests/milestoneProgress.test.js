import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateMilestoneProgress,
  checkMilestoneOrWeight,
  getMilestoneWeight,
  synchronizeIwoStatus,
} from '../utils/milestoneProgress.js';

test('calculates partial progress by milestone name and caps it at 65%', () => {
  const milestones = [
    { name: 'Survey', status: 'DONE' },
    { name: 'Surat Izin', status: 'DONE' },
    { name: 'Pembayaran Deposit', status: 'DONE' },
    { name: 'Supervisi', status: 'DONE' },
    { name: 'Request Barang', status: 'DONE' },
    { name: 'Request IP', status: 'DONE' },
    { name: 'Request Perangkat', status: 'DONE' },
  ];

  assert.equal(calculateMilestoneProgress(milestones), 55);
  assert.equal(calculateMilestoneProgress([...milestones, ...milestones]), 65);
});

test('does not count unfinished or skipped milestones', () => {
  const milestones = [
    { name: 'Survey', status: 'PENDING' },
    { name: 'Request IP', status: 'SKIPPED' },
  ];

  assert.equal(calculateMilestoneProgress(milestones), 0);
});

test('locks progress at 70% when BB cable pull is complete', () => {
  const milestones = [
    { name: 'Survey', status: 'DONE' },
    { name: 'Penarikan Kabel BB', status: 'DONE' },
  ];

  assert.equal(calculateMilestoneProgress(milestones), 70);
});

test('detects partial, case-insensitive BB, cable, FO, and pulling milestone names', () => {
  for (const name of [
    'Penarikan BB',
    'Penarikan Kabel BB',
    'Penarikan Kabel',
    'Penarikan FO',
    'Penarikan Fiber Optic',
    'Pulling Kabel',
    'proses PULLING jaringan',
    'Backbone',
  ]) {
    assert.deepEqual(checkMilestoneOrWeight(name), { weight: 70, isMilestone: true }, name);
    assert.equal(calculateMilestoneProgress([{ name, status: 'DONE' }]), 70, name);
  }
});

test('locks progress at 80% for VLAN alignment unless activation is complete', () => {
  const milestones = [
    { name: 'Penarikan Kabel BB', status: 'DONE' },
    { name: 'Pelurusan VLAN', status: 'DONE' },
  ];

  assert.equal(calculateMilestoneProgress(milestones), 80);
});

test('locks progress at 100% for internet activation even without earlier milestones', () => {
  assert.equal(calculateMilestoneProgress([
    { name: 'Survey', status: 'PENDING' },
    { name: 'Penarikan Kabel BB', status: 'SKIPPED' },
    { name: 'Aktivasi Internet', status: 'DONE' },
  ]), 100);
});

test('activation lock takes precedence over completed VLAN and cable milestones', () => {
  assert.equal(calculateMilestoneProgress([
    { name: 'Penarikan Kabel BB', status: 'DONE' },
    { name: 'Pelurusan VLAN', status: 'DONE' },
    { name: 'Aktivasi Internet', status: 'DONE' },
  ]), 100);
});

test('assigns displayed milestone weights automatically from names', () => {
  assert.equal(getMilestoneWeight(' Survey '), 10);
  assert.equal(getMilestoneWeight('Request Perangkat'), 5);
  assert.equal(getMilestoneWeight('Penarikan FO'), 70);
  assert.equal(getMilestoneWeight('Penarikan Kabel BB'), 70);
  assert.equal(getMilestoneWeight('Pelurusan VLAN'), 80);
  assert.equal(getMilestoneWeight('Aktivasi Internet'), 100);
  assert.equal(getMilestoneWeight('Tahapan lainnya'), 0);
});

test('synchronizes IWO status to draft, pending, in progress, and completed by progress', () => {
  assert.equal(synchronizeIwoStatus('DRAFT', 0), 'DRAFT');
  assert.equal(synchronizeIwoStatus('IN_PROGRESS', 0), 'PENDING');
  assert.equal(synchronizeIwoStatus('PENDING', 10), 'IN_PROGRESS');
  assert.equal(synchronizeIwoStatus('ACTIVATION', 80), 'IN_PROGRESS');
  assert.equal(synchronizeIwoStatus('PENDING', 100), 'COMPLETED');
  assert.equal(synchronizeIwoStatus('COMPLETED', 65), 'IN_PROGRESS');
  assert.equal(synchronizeIwoStatus('COMPLETED', 0), 'PENDING');
});

test('preserves manually locked pending and cancelled statuses', () => {
  assert.equal(synchronizeIwoStatus('PENDING', 65, true), 'PENDING');
  assert.equal(synchronizeIwoStatus('CANCELLED', 100, true), 'CANCELLED');
  assert.equal(synchronizeIwoStatus('CANCELLED', 65, false), 'CANCELLED');
  assert.equal(synchronizeIwoStatus('PENDING', 65, false), 'IN_PROGRESS');
});
