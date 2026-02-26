export const GOV_ID_TYPE_OPTIONS = [
  'National ID',
  'Passport',
  "Driver's License",
  'UMID',
  'PRC',
  'SSS Card',
  "Voter's ID",
  'Postal ID',
  'GSIS Card',
  'PRC ID',
  'Senior Citizen ID',
] as const

export type GovIdType = (typeof GOV_ID_TYPE_OPTIONS)[number]
