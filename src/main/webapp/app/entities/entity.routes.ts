import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'address',
    data: { pageTitle: 'hcAdminApp.directoryAddress.home.title', breadcrumb: 'global.menu.group.directory' },
    loadChildren: () => import('./directory/address/address.routes'),
  },
  {
    path: 'profile',
    data: { pageTitle: 'hcAdminApp.directoryProfile.home.title', breadcrumb: 'global.menu.group.directory' },
    loadChildren: () => import('./directory/profile/profile.routes'),
  },
  {
    path: 'organisation',
    data: { pageTitle: 'hcAdminApp.platformOrganisation.home.title', breadcrumb: 'global.menu.group.account' },
    loadChildren: () => import('./platform/organisation/organisation.routes'),
  },
  {
    path: 'hub',
    data: { pageTitle: 'hcAdminApp.platformHub.home.title', breadcrumb: 'global.menu.group.account' },
    loadChildren: () => import('./platform/hub/hub.routes'),
  },
  {
    path: 'angel',
    data: { pageTitle: 'hcAdminApp.directoryAngel.home.title', breadcrumb: 'global.menu.group.directory' },
    loadChildren: () => import('./directory/angel/angel.routes'),
  },
  {
    path: 'patient',
    data: { pageTitle: 'hcAdminApp.directoryPatient.home.title', breadcrumb: 'global.menu.group.directory' },
    loadChildren: () => import('./directory/patient/patient.routes'),
  },
  {
    path: 'professional',
    data: { pageTitle: 'hcAdminApp.directoryProfessional.home.title', breadcrumb: 'global.menu.group.directory' },
    loadChildren: () => import('./directory/professional/professional.routes'),
  },
  {
    path: 'team',
    data: { pageTitle: 'hcAdminApp.platformTeam.home.title', breadcrumb: 'global.menu.group.account' },
    loadChildren: () => import('./platform/team/team.routes'),
  },
  {
    path: 'vendor',
    data: { pageTitle: 'hcAdminApp.directoryVendor.home.title', breadcrumb: 'global.menu.group.directory' },
    loadChildren: () => import('./directory/vendor/vendor.routes'),
  },
  {
    path: 'message',
    data: { pageTitle: 'hcAdminApp.operationsMessage.home.title', breadcrumb: 'global.menu.group.operations' },
    loadChildren: () => import('./operations/message/message.routes'),
  },
  {
    path: 'task',
    data: { pageTitle: 'hcAdminApp.operationsTask.home.title', breadcrumb: 'global.menu.group.operations' },
    loadChildren: () => import('./operations/task/task.routes'),
  },
  {
    path: 'roster-week',
    data: { pageTitle: 'hcAdminApp.operationsRosterWeek.home.title', breadcrumb: 'global.menu.group.operations' },
    loadChildren: () => import('./operations/roster-week/roster-week.routes'),
  },
  {
    path: 'shift-assignment',
    data: { pageTitle: 'hcAdminApp.operationsShiftAssignment.home.title', breadcrumb: 'global.menu.group.operations' },
    loadChildren: () => import('./operations/shift-assignment/shift-assignment.routes'),
  },
  {
    path: 'service-plan',
    data: { pageTitle: 'hcAdminApp.catalogueServicePlan.home.title', breadcrumb: 'global.menu.group.catalogue' },
    loadChildren: () => import('./catalogue/service-plan/service-plan.routes'),
  },
  {
    path: 'plan-feature',
    data: { pageTitle: 'hcAdminApp.cataloguePlanFeature.home.title', breadcrumb: 'global.menu.group.catalogue' },
    loadChildren: () => import('./catalogue/plan-feature/plan-feature.routes'),
  },
  {
    path: 'category',
    data: { pageTitle: 'hcAdminApp.catalogueCategory.home.title', breadcrumb: 'global.menu.group.catalogue' },
    loadChildren: () => import('./catalogue/category/category.routes'),
  },
  {
    path: 'service-activity',
    data: { pageTitle: 'hcAdminApp.catalogueServiceActivity.home.title', breadcrumb: 'global.menu.group.catalogue' },
    loadChildren: () => import('./catalogue/service-activity/service-activity.routes'),
  },
  {
    path: 'care-activity',
    data: { pageTitle: 'hcAdminApp.platformCareActivity.home.title', breadcrumb: 'global.menu.group.account' },
    loadChildren: () => import('./platform/care-activity/care-activity.routes'),
  },
  {
    path: 'document',
    data: { pageTitle: 'hcAdminApp.platformDocument.home.title', breadcrumb: 'global.menu.group.account' },
    loadChildren: () => import('./platform/document/document.routes'),
  },
  {
    path: 'credential',
    data: { pageTitle: 'hcAdminApp.platformCredential.home.title', breadcrumb: 'global.menu.group.account' },
    loadChildren: () => import('./platform/credential/credential.routes'),
  },
  {
    path: 'user-option',
    data: { pageTitle: 'hcAdminApp.platformUserOption.home.title', breadcrumb: 'global.menu.group.account' },
    loadChildren: () => import('./platform/user-option/user-option.routes'),
  },
  {
    path: 'platform-service',
    data: { pageTitle: 'hcAdminApp.platformPlatformService.home.title', breadcrumb: 'global.menu.group.account' },
    loadChildren: () => import('./platform/platform-service/platform-service.routes'),
  },
  {
    path: 'audit-entry',
    data: { pageTitle: 'hcAdminApp.platformAuditEntry.home.title', breadcrumb: 'global.menu.group.account' },
    loadChildren: () => import('./platform/audit-entry/audit-entry.routes'),
  },
  /* jhipster-needle-add-entity-route - JHipster will add entity modules routes here */
];

export default routes;
