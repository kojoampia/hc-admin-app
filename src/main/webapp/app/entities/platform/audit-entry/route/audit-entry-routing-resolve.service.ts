import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, Router } from '@angular/router';

import { EMPTY, Observable, catchError, of } from 'rxjs';

import { IAuditEntry } from '../audit-entry.model';
import { AuditEntryService } from '../service/audit-entry.service';

const auditEntryResolve = (route: ActivatedRouteSnapshot): Observable<null | IAuditEntry> => {
  const { id } = route.params;
  if (id) {
    const router = inject(Router);
    const service = inject(AuditEntryService);
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

export default auditEntryResolve;
