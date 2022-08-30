import {Entity, model, property} from '@loopback/repository';

@model({settings: {strict: true, plural: 'Stats'}})
export class Stats extends Entity {
  @property({
    type: 'number',
    id: 1,
    generated: true,
    updateOnly: true,
  })
  userID?: number;

  // Define well-known properties here

  // Indexer property to allow additional data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [prop: string]: any;

  constructor(data?: Partial<Stats>) {
    super(data);
  }
}

export interface StatsRelations {
  // describe navigational properties here
}

export type StatsWithRelations = Stats & StatsRelations;
