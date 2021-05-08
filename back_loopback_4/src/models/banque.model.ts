import {Entity, model, property} from '@loopback/repository';

@model({
  settings: {
    strict: true,
    forceId: false,
    validateUpsert: true,
    plural: 'Banques',
    idInjection: false
  }
})
export class Banque extends Entity {
  @property({
    type: 'number',
    id: true,
  })
  IDbanque?: number;

  @property({
    type: 'string',
    required: true,
  })
  NomBanque: string;

  // Define well-known properties here

  // Indexer property to allow additional data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [prop: string]: any;

  constructor(data?: Partial<Banque>) {
    super(data);
  }
}

export interface BanqueRelations {
  // describe navigational properties here
}

export type BanqueWithRelations = Banque & BanqueRelations;
