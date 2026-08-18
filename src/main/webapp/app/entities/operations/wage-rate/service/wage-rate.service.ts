import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import dayjs from 'dayjs/esm';
import { Observable, map } from 'rxjs';

import { DATE_FORMAT } from 'app/config/input.constants';
import { ADMIN_SERVICE } from 'app/config/microservice.constants';
import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { createRequestOption } from 'app/core/request/request-util';
import { ProfessionalRole } from 'app/entities/enumerations/professional-role.model';

import { IWageRate, NewWageRate } from '../wage-rate.model';

type RestOf<T extends IWageRate | NewWageRate> = Omit<T, 'validFrom' | 'lastModifiedDate'> & {
  validFrom?: string | null;
  lastModifiedDate?: string | null;
};

export type RestWageRate = RestOf<IWageRate>;

@Injectable({ providedIn: 'root' })
export class WageRateService {
  protected readonly http = inject(HttpClient);
  protected readonly applicationConfigService = inject(ApplicationConfigService);
  protected readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/wage-rates', ADMIN_SERVICE);

  /**
   * The rate in force for each role, one row apiece.
   *
   * Not a page: the result is bounded by the size of the role enum, and the configuration screen
   * wants all of it at once. A role nobody has priced is simply absent, which the screen has to
   * render as "not set" rather than as zero — a rate of zero is a real, if unlikely, decision.
   */
  current(asOf?: dayjs.Dayjs): Observable<IWageRate[]> {
    const params: Record<string, string> = asOf ? { asOf: asOf.format(DATE_FORMAT) } : {};
    return this.http.get<RestWageRate[]>(`${this.resourceUrl}/current`, { params }).pipe(map(rates => rates.map(convertFromServer)));
  }

  /** Every rate ever set for a role, newest effective date first. */
  history(role: ProfessionalRole): Observable<IWageRate[]> {
    return this.http.get<RestWageRate[]>(`${this.resourceUrl}/history/${role}`).pipe(map(rates => rates.map(convertFromServer)));
  }

  /**
   * Records a new rate. This is how a price *change* is made — a new row with a later `validFrom`,
   * not an edit of the row it supersedes.
   */
  create(wageRate: NewWageRate): Observable<IWageRate> {
    return this.http.post<RestWageRate>(this.resourceUrl, convertFromClient(wageRate)).pipe(map(convertFromServer));
  }

  /**
   * Corrects a rate that was entered wrongly. Distinct from {@link create}: this rewrites history,
   * so it is offered as "correct this entry", never as "change the price".
   */
  update(wageRate: IWageRate): Observable<IWageRate> {
    return this.http
      .put<RestWageRate>(`${this.resourceUrl}/${encodeURIComponent(wageRate.id)}`, convertFromClient(wageRate))
      .pipe(map(convertFromServer));
  }

  delete(id: string): Observable<undefined> {
    return this.http.delete<undefined>(`${this.resourceUrl}/${encodeURIComponent(id)}`);
  }

  query(req?: any): Observable<HttpResponse<IWageRate[]>> {
    const options = createRequestOption(req);
    return this.http
      .get<RestWageRate[]>(this.resourceUrl, { params: options, observe: 'response' })
      .pipe(map(res => res.clone({ body: (res.body ?? []).map(convertFromServer) })));
  }
}

function convertFromServer(rate: RestWageRate): IWageRate {
  return {
    ...rate,
    validFrom: rate.validFrom ? dayjs(rate.validFrom) : null,
    lastModifiedDate: rate.lastModifiedDate ? dayjs(rate.lastModifiedDate) : null,
  };
}

function convertFromClient<T extends IWageRate | NewWageRate>(rate: T): RestOf<T> {
  // lastModified* are stamped server-side and ignored on the way in; sending them back would be
  // harmless but misleading, so they are dropped rather than round-tripped.
  const { lastModifiedBy, lastModifiedDate, ...rest } = rate;
  return {
    ...rest,
    validFrom: rate.validFrom?.format(DATE_FORMAT) ?? null,
  } as RestOf<T>;
}
