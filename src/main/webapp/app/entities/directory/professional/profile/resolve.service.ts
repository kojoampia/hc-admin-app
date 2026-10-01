import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, Router } from '@angular/router';

import { EMPTY, Observable, catchError, of } from 'rxjs';
import { ProfessionalProfileService } from './professional-profile.service';
import { IProfessionalProfile } from '../professional.model';

const ProfessionalProfileResolve = (route: ActivatedRouteSnapshot): Observable<null | IProfessionalProfile> => {
  const { id } = route.params;
  if (id) {
    const router = inject(Router);
    const service = inject(ProfessionalProfileService);
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

export default ProfessionalProfileResolve;
