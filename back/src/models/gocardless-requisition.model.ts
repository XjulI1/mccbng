import {Entity, model, property} from '@loopback/repository';

@model({
  settings: {
    strict: true,
    forceId: false,
    validateUpsert: true,
    plural: 'GoCardlessRequisitions',
    idInjection: false,
  },
})
export class GoCardlessRequisition extends Entity {
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
  requisitionId: string;

  @property({
    type: 'string',
    required: true,
  })
  institutionId: string;

  @property({
    type: 'string',
    default: 'CR',
  })
  status?: string;

  @property({
    type: 'string',
  })
  link?: string;

  @property({
    type: 'number',
    required: true,
  })
  IDuser: number;

  @property({
    type: 'date',
  })
  createdAt?: string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [prop: string]: any;

  constructor(data?: Partial<GoCardlessRequisition>) {
    super(data);
  }
}

export interface GoCardlessRequisitionRelations {}

export type GoCardlessRequisitionWithRelations = GoCardlessRequisition &
  GoCardlessRequisitionRelations;
