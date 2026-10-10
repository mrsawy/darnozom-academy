export interface IChild {
  _id: string;
  username: string;
  email: string;
  phone: string;
  firstName?: string;
  lastName?: string;
  country?: string;
  status: string;
  roleName: string;
  passwordLastUpdated?: string | null;
}

export interface ILinkedParentInfo {
  _id: string;
  email: string;
  username: string;
  passwordLastUpdated?: string | null;
  /** True when the student created this parent account from Parent info (not registration auto-parent). */
  parentCreatedByStudent?: boolean;
}

export interface ICreateChildDto {
  username: string;
  email: string;
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
  country: string;
}

export interface IUpdateChildDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
  country?: string;
}

export interface ICreateParentDto {
  username: string;
  email: string;
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
  country: string;
}
