import {Entity, model, property} from '@loopback/repository';

@model({
  settings: {
    strict: true,
    forceId: false,
    validateUpsert: true,
    plural: 'Operations',
    idInjection: false,
  },
})
export class Operation extends Entity {
  @property({
    type: 'number',
    id: true,
    generated: true,
  })
  IDop?: number;

  @property({
    type: 'string',
    required: true,
  })
  NomOp: string;

  @property({
    type: 'number',
    required: true,
    dataType: 'FLOAT',
  })
  MontantOp: number;

  @property({
    type: 'date',
    required: true,
  })
  DateOp: string;

  @property({
    type: 'boolean',
    default: false,
  })
  CheckOp: boolean;

  @property({
    type: 'number',
    required: true,
  })
  IDcompte: number;

  @property({
    type: 'number',
    default: 0,
  })
  IDcat?: number;

  @property({
    type: 'boolean',
    default: false,
  })
  amortissement?: boolean;

  // Define well-known properties here

  // Indexer property to allow additional data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [prop: string]: any;

  constructor(data?: Partial<Operation>) {
    super(data);
  }
}

export interface OperationRelations {
  // describe navigational properties here
}

export type OperationWithRelations = Operation & OperationRelations;
