import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, Router } from '@angular/router';

import { EMPTY, Observable, catchError, of } from 'rxjs';

import { ServicePlanService } from '../service/service-plan.service';
import { IServicePlan } from '../service-plan.model';

const servicePlanResolve = (route: ActivatedRouteSnapshot): Observable<null | IServicePlan> => {
  const { id } = route.params;
  if (id) {
    const router = inject(Router);
    const service = inject(ServicePlanService);
    return service.find(id).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404) {
          router.navigate(['404']);
        } else {
          router.navigate(['error']);
        }
        return EMPTY;
      }),
    );
  }

  return of(null);
};

export default servicePlanResolve;
