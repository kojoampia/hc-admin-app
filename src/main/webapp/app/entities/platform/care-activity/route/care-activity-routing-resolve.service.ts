import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, Router } from '@angular/router';

import { EMPTY, Observable, catchError, of } from 'rxjs';

import { ICareActivity } from '../care-activity.model';
import { CareActivityService } from '../service/care-activity.service';

const careActivityResolve = (route: ActivatedRouteSnapshot): Observable<null | ICareActivity> => {
  const { id } = route.params;
  if (id) {
    const router = inject(Router);
    const service = inject(CareActivityService);
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

export default careActivityResolve;
