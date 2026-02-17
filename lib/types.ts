export type User = {
  id: string
  email: string
  full_name: string
}

export type RentalProperty = {
  id: string
  name: string
  address: string
  code: string
  no_units: number
  created_at: string
}

export type Unit = {
  id: string
  rental_property_id: string
  name: string
  track_utilities: boolean
  contract_address: string
  rent_amount: number
  cash_bond_amount: number
  created_at: string
}

export type Tenant = {
  id: string
  unit_id: string
  first_name: string
  last_name: string
  contract_name: string
  contact_no: string
  messenger: string
  address: string
  begin_contract: string
  end_contract: string
  created_at: string
}

export type Contract = {
  id: string
  unit_id: string
  year: number
  signed: boolean
  notarized: boolean
  signed_recorded_by: string | null
  notarized_recorded_by: string | null
  created_at: string
}

export type RentPayment = {
  id: string
  unit_id: string
  year: number
  month: number
  paid: boolean
  recorded_by_user_id: string
  recorded_date: string
  created_at: string
}

export type Utility = {
  id: string
  unit_id: string
  type: 'MNWD' | 'Casureco'
  due_date: string
  date_of_reading: string
  unit_reading: number
  first_floor_reading: number
  second_floor_reading: number
  amount: number
  created_at: string
}

export type UtilityPayment = {
  id: string
  utility_id: string
  paid: boolean
  recorded_by_user_id: string
  recorded_date: string
  created_at: string
}

export type UnitWithTenant = Unit & {
  tenant: Tenant | null
}

export type PropertyWithUnits = RentalProperty & {
  units: Unit[]
}
