export type FieldType =
  | 'text'
  | 'number'
  | 'select'
  | 'multiSelect'
  | 'date'
  | 'checkbox'
  | 'user'
  | 'phone'
  | 'email'
  | 'url'
  | 'attachment'
  | 'singleLink'
  | 'lookup'
  | 'formula'
  | 'createdTime'
  | 'modifiedTime'
  | 'createdUser'
  | 'modifiedUser';

export interface Field {
  id: string;
  name: string;
  type: FieldType;
  property?: { [key: string]: unknown };
}

export interface Record {
  recordId: string;
  fields: { [key: string]: unknown };
}
