import {Entity, model, property} from '@loopback/repository';

@model({
  settings: {
    strict: true,
    forceId: false,
    validateUpsert: true,
    plural: 'GoCardlessAccounts',
    idInjection: false,
  },
})
export class GoCardlessAccount extends Entity {
  @property({
    type: 'number',
    id: true,
    generated: true,
  })
  id?: number;

  @property({
    type: 'string',
    required: true,
  })
  accountId: string;

  @property({
    type: 'number',
    required: true,
  })
  IDcompte: number;

  @property({
    type: 'string',
    required: true,
  })
  requisitionId: string;

  @property({
    type: 'string',
  })
  iban?: string;

  @property({
    type: 'string',
  })
  institutionId?: string;

  @property({
    type: 'date',
  })
  lastSync?: string;

  @property({
    type: 'number',
    required: true,
  })
  IDuser: number;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [prop: string]: any;

  constructor(data?: Partial<GoCardlessAccount>) {
    super(data);
  }
}

export interface GoCardlessAccountRelations {}

export type GoCardlessAccountWithRelations = GoCardlessAccount &
  GoCardlessAccountRelations;
