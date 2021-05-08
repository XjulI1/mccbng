import {belongsTo, Entity, model, property} from '@loopback/repository';
import {Banque} from "./banque.model";

@model({
  settings: {
    strict: true,
    forceId: false,
    validateUpsert: true,
    plural: 'Comptes',
    idInjection: false
  }
})
export class Compte extends Entity {
  @property({
    type: 'number',
    id: true,
  })
  IDcompte?: number;

  @belongsTo(() => Banque)
  IDbanque: number; // customized foreign key name

  @property({
    type: 'string',
    required: true,
  })
  NomCompte: string;

  @property({
    type: 'number',
    required: true,
  })
  solde: number;

  @property({
    type: 'number',
    required: true,
  })
  IDuser: number;

  @property({
    type: 'boolean',
    default: false,
  })
  bloque?: boolean;

  @property({
    type: 'boolean',
    default: false,
  })
  porte_feuille?: boolean;

  @property({
    type: 'boolean',
    default: true,
  })
  visible?: boolean;

  // Define well-known properties here

  // Indexer property to allow additional data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [prop: string]: any;

  constructor(data?: Partial<Compte>) {
    super(data);
  }
}

export interface CompteRelations {
  // describe navigational properties here
}

export type CompteWithRelations = Compte & CompteRelations;
