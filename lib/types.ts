export type User = {
  id: string
  email: string
  full_name: string
  phone_number: string | null
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
  paired_unit_id: string | null
  rent_amount: number
  created_at: string
}

export type UnitPairing = {
  id: string
  first_unit_id: string
  second_unit_id: string
  created_at: string
}

export type Tenant = {
  id: string
  unit_id: string
  first_name: string
  last_name: string
  contact_no: string
  messenger: string
  gov_id_type: string | null
  gov_id_no: string | null
  id_issued_date: string | null
  id_expiry_date: string | null
  created_at: string
}

export type Landlord = {
  id: string
  first_name: string
  middle_name: string
  last_name: string
  name_prefix: string | null
  citizenship: string
  marital_status: string
  postal_address: string
  gov_id_type: string
  gov_id_no: string
  id_issued_date: string
  id_expiry_date: string
  created_at: string
}

export type Contract = {
  id: string
  unit_id: string
  tenant_id: string
  landlord_id: string
  year: number
  first_name: string
  middle_name: string
  last_name: string
  citizenship: string
  marital_status: string
  tenant_address: string
  unit_specification: string
  property_specification: string
  rent: number
  cash_bond: number
  begin_contract: string
  end_contract: string
  signed: boolean
  recorded_by_user_id: string | null
  recorded_date: string | null
  comments: string | null
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
  comments: string | null
  created_at: string
}

export type Utility = {
  id: string
  pairing_id: string | null
  unit_id?: string | null
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
  unit_id: string
  paid: boolean
  recorded_by_user_id: string
  recorded_date: string
  comments: string | null
  created_at: string
}

export type UnitWithTenant = Unit & {
  tenant: Tenant | null
}

export type PropertyWithUnits = RentalProperty & {
  units: Unit[]
}
