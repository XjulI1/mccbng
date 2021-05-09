import {Entity, model, property} from '@loopback/repository';

@model({
  settings: {
    strict: true,
    forceId: false,
    validateUpsert: true,
    plural: 'OperationRecurrentes',
    idInjection: false
  }
})
export class OperationRecurrente extends Entity {
  @property({
    type: 'number',
    id: true,
  })
  IDopRecu?: number;

  @property({
    type: 'string',
    required: true,
  })
  NomOpRecu: string;

  @property({
    type: 'number',
    required: true,
  })
  MontantOpRecu: number;

  @property({
    type: 'number',
    required: true,
  })
  JourOpRecu: number;

  @property({
    type: 'number',
    default: 1,
  })
  JourNumOpRecu?: number;

  @property({
    type: 'number',
    default: 1,
  })
  MoisOpRecu?: number;

  @property({
    type: 'number',
    default: 3,
  })
  Frequence?: number;

  @property({
    type: 'date',
    required: true,
  })
  DernierDateOpRecu: string;

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

  // Define well-known properties here

  // Indexer property to allow additional data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [prop: string]: any;

  constructor(data?: Partial<OperationRecurrente>) {
    super(data);
  }
}

export interface OperationRecurrenteRelations {
  // describe navigational properties here
}

export type OperationRecurrenteWithRelations = OperationRecurrente & OperationRecurrenteRelations;
