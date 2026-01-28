import {Entity, model, property} from '@loopback/repository';

@model({
  settings: {
    strict: true,
    forceId: false,
    validateUpsert: true,
    plural: 'Credits',
    idInjection: false,
  },
})
export class Credit extends Entity {
  @property({
    type: 'number',
    id: true,
    generated: true,
  })
  IDcredit?: number;

  @property({
    type: 'string',
    required: true,
  })
  NomCredit: string;

  @property({
    type: 'string',
    required: false,
  })
  NomPreteur?: string;

  @property({
    type: 'number',
    required: true,
    dataType: 'FLOAT',
  })
  MontantInitial: number;

  @property({
    type: 'number',
    required: true,
    dataType: 'FLOAT',
  })
  MontantMensuel: number;

  @property({
    type: 'number',
    required: false,
    dataType: 'FLOAT',
  })
  TauxInteret?: number;

  @property({
    type: 'date',
    required: true,
  })
  DateDebut: string;

  @property({
    type: 'date',
    required: true,
  })
  DateFin: string;

  @property({
    type: 'number',
    required: true,
  })
  IDcompte: number;

  @property({
    type: 'number',
    required: false,
  })
  IDopRecu?: number;

  @property({
    type: 'number',
    required: true,
  })
  IDuser: number;

  @property({
    type: 'string',
    required: false,
    default: 'actif',
  })
  Statut?: string;

  @property({
    type: 'number',
    required: false,
    default: 0,
  })
  IDcat?: number;

  // Define well-known properties here

  // Indexer property to allow additional data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [prop: string]: any;

  constructor(data?: Partial<Credit>) {
    super(data);
  }
}

export interface CreditRelations {
  // describe navigational properties here
}

export type CreditWithRelations = Credit & CreditRelations;
