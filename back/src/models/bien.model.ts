import {Entity, model, property} from '@loopback/repository';

@model({
  settings: {
    strict: true,
    forceId: false,
    validateUpsert: true,
    plural: 'Biens',
    idInjection: false,
  },
})
export class Bien extends Entity {
  @property({
    type: 'number',
    id: true,
    generated: true,
  })
  IDbien?: number;

  @property({
    type: 'string',
    required: true,
  })
  NomBien: string;

  @property({
    type: 'string',
    required: true,
  })
  Ville: string;

  @property({
    type: 'string',
    required: true,
  })
  TypeBien: string;

  @property({
    type: 'number',
    required: false,
    dataType: 'FLOAT',
  })
  Surface?: number;

  @property({
    type: 'string',
    required: true,
    default: 'principale',
  })
  Usage: string;

  @property({
    type: 'date',
    required: true,
  })
  DateAchat: string;

  @property({
    type: 'number',
    required: true,
    dataType: 'FLOAT',
  })
  PrixBienNu: number;

  @property({
    type: 'number',
    required: true,
    dataType: 'FLOAT',
  })
  FraisNotaire: number;

  @property({
    type: 'number',
    required: false,
    dataType: 'FLOAT',
    default: 0,
  })
  FraisAgence?: number;

  @property({
    type: 'number',
    required: false,
    dataType: 'FLOAT',
    default: 0,
  })
  ApportCash?: number;

  @property({
    type: 'number',
    required: false,
    dataType: 'FLOAT',
  })
  ValeurActuelle?: number;

  @property({
    type: 'number',
    required: false,
  })
  IDcredit?: number;

  @property({
    type: 'number',
    required: true,
  })
  IDuser: number;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [prop: string]: any;

  constructor(data?: Partial<Bien>) {
    super(data);
  }
}

export interface BienRelations {
  // describe navigational properties here
}

export type BienWithRelations = Bien & BienRelations;
