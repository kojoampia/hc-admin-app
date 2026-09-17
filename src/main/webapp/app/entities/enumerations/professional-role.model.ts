// Mirrors net.jojoaddison.domain.enumeration.ProfessionalRole.
//
// CAREGIVER was renamed to CARER on 2026-09-16 so this estate says one word for one discipline
// (backlog item 35, D3) — the api rename is a Mongock migration, because the value is persisted.
//
// PHARMACIST, CHEMIST and TECHNICIAN are DIRECTORY ONLY (item 35, D2): hc-professional recognises
// eight disciplines and hc-admin pays five, so these three can be described and shown but are never
// rostered or priced. The wage grid is five roles by five shift types and must stay that way — the
// api's ProfessionalRole.PAYABLE is the authoritative list, and a round asking for one of the three
// is refused there with reason ROLE_IS_NOT_ROSTERED_HERE.
export enum ProfessionalRole {
  CARER = 'CARER',

  PARAMEDIC = 'PARAMEDIC',

  THERAPIST = 'THERAPIST',

  NURSE = 'NURSE',

  DOCTOR = 'DOCTOR',

  PHARMACIST = 'PHARMACIST',

  CHEMIST = 'CHEMIST',

  TECHNICIAN = 'TECHNICIAN',
}
