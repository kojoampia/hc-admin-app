import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap/modal';
import { TranslatePipe } from '@ngx-translate/core';

import { AlertError } from 'app/shared/alert/alert-error';
import { TranslateDirective } from 'app/shared/language';

import { UserManagementService } from '../service/user-management.service';
import { IUser } from '../user-management.model';

@Component({
  selector: 'abf-delete-user-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './user-management-delete-dialog.html',
  imports: [AlertError, TranslateDirective, TranslatePipe],
})
export class UserManagementDeleteDialog {
  user!: IUser;

  protected readonly activeModal = inject(NgbActiveModal);
  private readonly userService = inject(UserManagementService);

  cancel(): void {
    this.activeModal.dismiss();
  }

  confirmDelete(login: string): void {
    this.userService.delete(login).subscribe(() => this.activeModal.close('deleted'));
  }
}
