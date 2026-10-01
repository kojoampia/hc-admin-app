import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, Router } from '@angular/router';

import { EMPTY, Observable, catchError, of } from 'rxjs';

import { IProfessionalUser } from '../professional.model';
import { ProfessionalAccountService } from './service';

const ProfessionalAccountResolve = (route: ActivatedRouteSnapshot): Observable<null | IProfessionalUser> => {
  const { id } = route.params;
  if (id) {
    const router = inject(Router);
    const service = inject(ProfessionalAccountService);
    return service.findById(id).pipe(
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

export default ProfessionalAccountResolve;
