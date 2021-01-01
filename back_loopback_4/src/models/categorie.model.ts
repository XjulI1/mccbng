import {Entity, model, property} from '@loopback/repository';

@model({
  settings: {
    strict: false,
    forceId: false,
    validateUpsert: true,
    plural: 'Categories',
    idInjection: false
  }
})
export class Categorie extends Entity {
  @property({
    type: 'number',
    id: true,
  })
  IDcat?: number;

  @property({
    type: 'string',
    required: true,
  })
  Nom: string;

  @property({
    type: 'number',
    required: true,
  })
  IDuser: number;

  @property({
    type: 'boolean',
    default: true,
  })
  Stats?: boolean;

  // Define well-known properties here

  // Indexer property to allow additional data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [prop: string]: any;

  constructor(data?: Partial<Categorie>) {
    super(data);
  }
}

export interface CategorieRelations {
  // describe navigational properties here
}

export type CategorieWithRelations = Categorie & CategorieRelations;
