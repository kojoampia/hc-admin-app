import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, Router } from '@angular/router';

import { EMPTY, Observable, catchError, of } from 'rxjs';

import { UserOptionService } from '../service/user-option.service';
import { IUserOption } from '../user-option.model';

const userOptionResolve = (route: ActivatedRouteSnapshot): Observable<null | IUserOption> => {
  const { id } = route.params;
  if (id) {
    const router = inject(Router);
    const service = inject(UserOptionService);
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

export default userOptionResolve;
