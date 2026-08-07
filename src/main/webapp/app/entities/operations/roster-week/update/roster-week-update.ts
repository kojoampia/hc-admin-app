import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgbInputDatepicker } from '@ng-bootstrap/ng-bootstrap/datepicker';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable, finalize } from 'rxjs';

import { AlertError } from 'app/shared/alert/alert-error';
import { TranslateDirective } from 'app/shared/language';
import { IRosterWeek } from '../roster-week.model';
import { RosterWeekService } from '../service/roster-week.service';

import { RosterWeekFormGroup, RosterWeekFormService } from './roster-week-form.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'abf-roster-week-update',
  templateUrl: './roster-week-update.html',
  imports: [TranslateDirective, TranslatePipe, FontAwesomeModule, AlertError, ReactiveFormsModule, NgbInputDatepicker],
})
export class RosterWeekUpdate implements OnInit {
  readonly isSaving = signal(false);
  rosterWeek: IRosterWeek | null = null;

  protected rosterWeekService = inject(RosterWeekService);
  protected rosterWeekFormService = inject(RosterWeekFormService);
  protected activatedRoute = inject(ActivatedRoute);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  editForm: RosterWeekFormGroup = this.rosterWeekFormService.createRosterWeekFormGroup();

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(({ rosterWeek }) => {
      this.rosterWeek = rosterWeek;
      if (rosterWeek) {
        this.updateForm(rosterWeek);
      }
    });
  }

  previousState(): void {
    globalThis.history.back();
  }

  save(): void {
    this.isSaving.set(true);
    const rosterWeek = this.rosterWeekFormService.getRosterWeek(this.editForm);
    if (rosterWeek.id === null) {
      this.subscribeToSaveResponse(this.rosterWeekService.create(rosterWeek));
    } else {
      this.subscribeToSaveResponse(this.rosterWeekService.update(rosterWeek));
    }
  }

  protected subscribeToSaveResponse(result: Observable<IRosterWeek | null>): void {
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

  protected updateForm(rosterWeek: IRosterWeek): void {
    this.rosterWeek = rosterWeek;
    this.rosterWeekFormService.resetForm(this.editForm, rosterWeek);
  }
}
