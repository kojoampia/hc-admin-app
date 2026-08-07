import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable, finalize } from 'rxjs';

import { AlertError } from 'app/shared/alert/alert-error';
import { TranslateDirective } from 'app/shared/language';
import { IAngel } from '../angel.model';
import { AngelService } from '../service/angel.service';

import { AngelFormGroup, AngelFormService } from './angel-form.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'abf-angel-update',
  templateUrl: './angel-update.html',
  imports: [TranslateDirective, TranslatePipe, FontAwesomeModule, AlertError, ReactiveFormsModule],
})
export class AngelUpdate implements OnInit {
  readonly isSaving = signal(false);
  angel: IAngel | null = null;

  protected angelService = inject(AngelService);
  protected angelFormService = inject(AngelFormService);
  protected activatedRoute = inject(ActivatedRoute);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  editForm: AngelFormGroup = this.angelFormService.createAngelFormGroup();

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(({ angel }) => {
      this.angel = angel;
      if (angel) {
        this.updateForm(angel);
      }
    });
  }

  previousState(): void {
    globalThis.history.back();
  }

  save(): void {
    this.isSaving.set(true);
    const angel = this.angelFormService.getAngel(this.editForm);
    if (angel.id === null) {
      this.subscribeToSaveResponse(this.angelService.create(angel));
    } else {
      this.subscribeToSaveResponse(this.angelService.update(angel));
    }
  }

  protected subscribeToSaveResponse(result: Observable<IAngel | null>): void {
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

  protected updateForm(angel: IAngel): void {
    this.angel = angel;
    this.angelFormService.resetForm(this.editForm, angel);
  }
}
