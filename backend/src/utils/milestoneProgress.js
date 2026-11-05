const ACTIVATION_KEYWORDS = ['aktivasi', 'act'];
const VLAN_KEYWORDS = ['vlan', 'pelurusan'];
const PULLING_KEYWORDS = ['penarikan', 'kabel', 'bb', 'backbone', 'fiber', 'fo', 'pulling'];
const GROUP_ONE_KEYWORDS = ['survey', 'survei', 'surat izin', 'izin', 'deposit', 'supervisi'];
const GROUP_TWO_KEYWORDS = ['barang', 'ip', 'perangkat', 'request'];

function normalizeMilestoneName(name) {
  return typeof name === 'string' ? name.trim().toLocaleLowerCase('id-ID') : '';
}

function includesKeyword(name, keywords) {
  return keywords.some((keyword) => name.includes(keyword));
}

export function checkMilestoneOrWeight(stepTitle) {
  const name = normalizeMilestoneName(stepTitle);

  if (includesKeyword(name, ACTIVATION_KEYWORDS)) return { weight: 100, isMilestone: true };
  if (includesKeyword(name, VLAN_KEYWORDS)) return { weight: 80, isMilestone: true };
  if (includesKeyword(name, PULLING_KEYWORDS)) return { weight: 70, isMilestone: true };
  if (includesKeyword(name, GROUP_ONE_KEYWORDS)) return { weight: 10, isMilestone: false };
  if (includesKeyword(name, GROUP_TWO_KEYWORDS)) return { weight: 5, isMilestone: false };
  return { weight: 0, isMilestone: false };
}

export function getMilestoneWeight(name) {
  return checkMilestoneOrWeight(name).weight;
}

export function calculateMilestoneProgress(milestones = []) {
  const completed = milestones
    .filter((milestone) => milestone.status === 'DONE')
    .map((milestone) => checkMilestoneOrWeight(milestone.name));

  if (completed.some(({ weight, isMilestone }) => isMilestone && weight === 100)) return 100;
  if (completed.some(({ weight, isMilestone }) => isMilestone && weight === 80)) return 80;
  if (completed.some(({ weight, isMilestone }) => isMilestone && weight === 70)) return 70;

  const partialProgress = completed.reduce((total, { weight, isMilestone }) => (
    total + (!isMilestone ? weight : 0)
  ), 0);
  return Math.min(65, partialProgress);
}

export function synchronizeIwoStatus(currentStatus, progress, statusLocked = false) {
  if (currentStatus === 'CANCELLED') return currentStatus;
  if (statusLocked && currentStatus === 'PENDING') return currentStatus;
  if (progress >= 100) return 'COMPLETED';
  if (progress > 0) return 'IN_PROGRESS';
  return currentStatus === 'DRAFT' ? 'DRAFT' : 'PENDING';
}
