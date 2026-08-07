import { IPlatformService } from './platform-service.model';

export const sampleWithRequiredData: IPlatformService = {
  id: 'b8788501-9756-46d9-a781-c6ced605841d',
  name: 'pear verify',
  host: 'proliferate blah',
  port: 19014,
  plane: 'ick per',
  health: 'DOWN',
};

export const sampleWithPartialData: IPlatformService = {
  id: 'b319fd02-7caf-4d9d-b0e1-9b68c8182214',
  name: 'adrenalin',
  host: 'jot',
  port: 56934,
  plane: 'round however',
  health: 'DOWN',
  responseMs: 15882,
};

export const sampleWithFullData: IPlatformService = {
  id: 'f93dd17c-a711-419e-b545-be34ce662772',
  name: 'tabletop save',
  host: 'flight density',
  port: 42499,
  plane: 'woefully',
  health: 'DOWN',
  responseMs: 23386,
};
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
