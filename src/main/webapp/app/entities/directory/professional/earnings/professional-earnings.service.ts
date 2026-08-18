import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import dayjs from 'dayjs/esm';
import { Observable, map } from 'rxjs';

import { DATE_FORMAT } from 'app/config/input.constants';
import { ADMIN_SERVICE } from 'app/config/microservice.constants';
import { ApplicationConfigService } from 'app/core/config/application-config.service';

import { EarningsGranularity, IProfessionalEarnings } from './professional-earnings.model';

interface RestBucket {
  periodStart: string;
  periodEnd: string;
  shifts: number;
  amount: number;
}

interface RestEarnings extends Omit<IProfessionalEarnings, 'from' | 'to' | 'buckets'> {
  from: string;
  to: string;
  buckets: RestBucket[];
}

@Injectable({ providedIn: 'root' })
export class ProfessionalEarningsService {
  protected readonly http = inject(HttpClient);
  protected readonly applicationConfigService = inject(ApplicationConfigService);
  protected readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/professionals', ADMIN_SERVICE);

  /**
   * Shifts completed and value accrued for one professional, bucketed for the chart.
   *
   * `from` and `to` are left off unless asked for: the api picks a window that fills the series for
   * the granularity requested, so the client does not have to know that a monthly chart wants
   * twelve months and a daily one wants thirty days.
   */
  forProfessional(
    professionalId: string,
    granularity: EarningsGranularity,
    from?: dayjs.Dayjs,
    to?: dayjs.Dayjs,
  ): Observable<IProfessionalEarnings> {
    const params: Record<string, string> = { granularity };
    if (from) {
      params.from = from.format(DATE_FORMAT);
    }
    if (to) {
      params.to = to.format(DATE_FORMAT);
    }
    return this.http
      .get<RestEarnings>(`${this.resourceUrl}/${encodeURIComponent(professionalId)}/earnings`, { params })
      .pipe(map(convertFromServer));
  }
}

function convertFromServer(earnings: RestEarnings): IProfessionalEarnings {
  return {
    ...earnings,
    from: dayjs(earnings.from),
    to: dayjs(earnings.to),
    buckets: earnings.buckets.map(bucket => ({
      ...bucket,
      periodStart: dayjs(bucket.periodStart),
      periodEnd: dayjs(bucket.periodEnd),
    })),
  };
}
