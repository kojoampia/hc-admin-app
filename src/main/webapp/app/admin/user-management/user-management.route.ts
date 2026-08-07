import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, Routes } from '@angular/router';

import { Observable, of } from 'rxjs';

import { UserManagementService } from './service/user-management.service';
import { IUser } from './user-management.model';

/**
 * Users are addressed by LOGIN, not by id.
 *
 * That is the gateway's contract — `GET /api/admin/users/{login}` — and it is
 * why these routes read `:login` where an entity route would read `:id`.
 */
const userResolve = (route: ActivatedRouteSnapshot): Observable<IUser | null> => {
  const login = route.paramMap.get('login');
  return login ? inject(UserManagementService).find(login) : of(null as IUser | null);
};

const ADMIN_BREADCRUMB = 'global.menu.group.administration';

const userManagementRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/user-management'),
    data: { pageTitle: 'userManagement.home.title', breadcrumb: ADMIN_BREADCRUMB, defaultSort: 'id,asc' },
  },
  {
    path: 'new',
    loadComponent: () => import('./update/user-management-update'),
    data: { pageTitle: 'userManagement.home.createLabel', breadcrumb: ADMIN_BREADCRUMB },
  },
  {
    path: ':login/view',
    loadComponent: () => import('./detail/user-management-detail'),
    resolve: { user: userResolve },
    data: { pageTitle: 'userManagement.detail.title', breadcrumb: ADMIN_BREADCRUMB },
  },
  {
    path: ':login/edit',
    loadComponent: () => import('./update/user-management-update'),
    resolve: { user: userResolve },
    data: { pageTitle: 'userManagement.home.createOrEditLabel', breadcrumb: ADMIN_BREADCRUMB },
  },
];

export default userManagementRoute;
