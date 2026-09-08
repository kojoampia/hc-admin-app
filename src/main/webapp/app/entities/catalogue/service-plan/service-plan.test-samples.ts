import { IServicePlan, NewServicePlan } from './service-plan.model';

export const sampleWithRequiredData: IServicePlan = {
  id: 'd324bb4e-932d-4274-8bb7-1dd1af35e49b',
  name: 'strong brr',
  monthlyPrice: 17621.94,
  currency: 'mmm',
  featured: true,
};

export const sampleWithPartialData: IServicePlan = {
  id: '43bcc150-d77c-463a-8633-646c786724a5',
  name: 'unless',
  code: 'PAWPAW',
  monthlyPrice: 16499.76,
  currency: 'ath',
  summary: 'apropos omelet tomatillo',
  featured: true,
};

export const sampleWithFullData: IServicePlan = {
  id: 'd36daf0d-c4ba-43fd-be1d-be6b862581f3',
  name: 'anxiously phooey',
  code: 'PEAR',
  tierLabel: 'actually tank whereas',
  displayOrder: 1,
  monthlyPrice: 11822.78,
  currency: 'foo',
  summary: 'hm before',
  featured: true,
};

export const sampleWithNewData: NewServicePlan = {
  name: 'helpless willow',
  code: 'MELON',
  monthlyPrice: 12137.28,
  currency: 'zea',
  featured: false,
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
