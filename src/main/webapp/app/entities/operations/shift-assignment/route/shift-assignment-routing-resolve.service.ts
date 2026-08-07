import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, Router } from '@angular/router';

import { EMPTY, Observable, catchError, of } from 'rxjs';

import { ShiftAssignmentService } from '../service/shift-assignment.service';
import { IShiftAssignment } from '../shift-assignment.model';

const shiftAssignmentResolve = (route: ActivatedRouteSnapshot): Observable<null | IShiftAssignment> => {
  const { id } = route.params;
  if (id) {
    const router = inject(Router);
    const service = inject(ShiftAssignmentService);
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

export default shiftAssignmentResolve;
