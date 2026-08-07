import { IPlatformService } from './platform-service.model';

export const sampleWithRequiredData: IPlatformService = {
  id: 23287,
  name: 'minus long-term',
  host: 'hypothesise monster',
  port: 31293,
  plane: 'informal',
  health: 'HEALTHY',
};

export const sampleWithPartialData: IPlatformService = {
  id: 23276,
  name: 'more',
  host: 'valiantly massage vacantly',
  port: 16902,
  plane: 'absent',
  health: 'DEGRADED',
  responseMs: 10030,
};

export const sampleWithFullData: IPlatformService = {
  id: 32544,
  name: 'gadzooks founder',
  host: 'team',
  port: 25330,
  plane: 'ouch provided',
  health: 'DEGRADED',
  responseMs: 19216,
};
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
