import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, Router } from '@angular/router';

import { EMPTY, Observable, catchError, of } from 'rxjs';

import { VendorService } from '../service/vendor.service';
import { IVendor } from '../vendor.model';

const vendorResolve = (route: ActivatedRouteSnapshot): Observable<null | IVendor> => {
  const { id } = route.params;
  if (id) {
    const router = inject(Router);
    const service = inject(VendorService);
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

export default vendorResolve;
