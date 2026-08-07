import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable, finalize } from 'rxjs';

import { AlertError } from 'app/shared/alert/alert-error';
import { TranslateDirective } from 'app/shared/language';
import { UserOptionService } from '../service/user-option.service';
import { IUserOption } from '../user-option.model';

import { UserOptionFormGroup, UserOptionFormService } from './user-option-form.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'abf-user-option-update',
  templateUrl: './user-option-update.html',
  imports: [TranslateDirective, TranslatePipe, FontAwesomeModule, AlertError, ReactiveFormsModule],
})
export class UserOptionUpdate implements OnInit {
  readonly isSaving = signal(false);
  userOption: IUserOption | null = null;

  protected userOptionService = inject(UserOptionService);
  protected userOptionFormService = inject(UserOptionFormService);
  protected activatedRoute = inject(ActivatedRoute);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  editForm: UserOptionFormGroup = this.userOptionFormService.createUserOptionFormGroup();

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(({ userOption }) => {
      this.userOption = userOption;
      if (userOption) {
        this.updateForm(userOption);
      }
    });
  }

  previousState(): void {
    globalThis.history.back();
  }

  save(): void {
    this.isSaving.set(true);
    const userOption = this.userOptionFormService.getUserOption(this.editForm);
    if (userOption.id === null) {
      this.subscribeToSaveResponse(this.userOptionService.create(userOption));
    } else {
      this.subscribeToSaveResponse(this.userOptionService.update(userOption));
    }
  }

  protected subscribeToSaveResponse(result: Observable<IUserOption | null>): void {
    result.pipe(finalize(() => this.onSaveFinalize())).subscribe({
      next: () => this.onSaveSuccess(),
      error: () => this.onSaveError(),
    });
  }

  protected onSaveSuccess(): void {
    this.previousState();
  }

  protected onSaveError(): void {
    // Api for inheritance.
  }

  protected onSaveFinalize(): void {
    this.isSaving.set(false);
  }

  protected updateForm(userOption: IUserOption): void {
    this.userOption = userOption;
    this.userOptionFormService.resetForm(this.editForm, userOption);
  }
}
