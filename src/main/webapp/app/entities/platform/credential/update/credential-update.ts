import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable, finalize } from 'rxjs';

import { CredentialRole } from 'app/entities/enumerations/credential-role.model';
import { AlertError } from 'app/shared/alert/alert-error';
import { TranslateDirective } from 'app/shared/language';
import { ICredential } from '../credential.model';
import { CredentialService } from '../service/credential.service';

import { CredentialFormGroup, CredentialFormService } from './credential-form.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'abf-credential-update',
  templateUrl: './credential-update.html',
  imports: [TranslateDirective, TranslatePipe, FontAwesomeModule, AlertError, ReactiveFormsModule],
})
export class CredentialUpdate implements OnInit {
  readonly isSaving = signal(false);
  credential: ICredential | null = null;
  credentialRoleValues = Object.keys(CredentialRole);

  protected credentialService = inject(CredentialService);
  protected credentialFormService = inject(CredentialFormService);
  protected activatedRoute = inject(ActivatedRoute);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  editForm: CredentialFormGroup = this.credentialFormService.createCredentialFormGroup();

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(({ credential }) => {
      this.credential = credential;
      if (credential) {
        this.updateForm(credential);
      }
    });
  }

  previousState(): void {
    globalThis.history.back();
  }

  save(): void {
    this.isSaving.set(true);
    const credential = this.credentialFormService.getCredential(this.editForm);
    if (credential.id === null) {
      this.subscribeToSaveResponse(this.credentialService.create(credential));
    } else {
      this.subscribeToSaveResponse(this.credentialService.update(credential));
    }
  }

  protected subscribeToSaveResponse(result: Observable<ICredential | null>): void {
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

  protected updateForm(credential: ICredential): void {
    this.credential = credential;
    this.credentialFormService.resetForm(this.editForm, credential);
  }
}
