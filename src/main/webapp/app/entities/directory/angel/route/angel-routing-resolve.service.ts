import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, Router } from '@angular/router';

import { EMPTY, Observable, catchError, of } from 'rxjs';

import { IAngel } from '../angel.model';
import { AngelService } from '../service/angel.service';

const angelResolve = (route: ActivatedRouteSnapshot): Observable<null | IAngel> => {
  const { id } = route.params;
  if (id) {
    const router = inject(Router);
    const service = inject(AngelService);
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

export default angelResolve;
