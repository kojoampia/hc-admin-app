import { HttpResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgbInputDatepicker } from '@ng-bootstrap/ng-bootstrap/datepicker';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable, finalize, map } from 'rxjs';

import { IProfessional } from 'app/entities/directory/professional/professional.model';
import { ProfessionalService } from 'app/entities/directory/professional/service/professional.service';
import { ShiftType } from 'app/entities/enumerations/shift-type.model';
import { IRosterWeek } from 'app/entities/operations/roster-week/roster-week.model';
import { RosterWeekService } from 'app/entities/operations/roster-week/service/roster-week.service';
import { AlertError } from 'app/shared/alert/alert-error';
import { TranslateDirective } from 'app/shared/language';

import { ShiftAssignmentService } from '../service/shift-assignment.service';
import { IShiftAssignment } from '../shift-assignment.model';

import { ShiftAssignmentFormGroup, ShiftAssignmentFormService } from './shift-assignment-form.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'abf-shift-assignment-update',
  templateUrl: './shift-assignment-update.html',
  imports: [TranslateDirective, TranslatePipe, FontAwesomeModule, AlertError, ReactiveFormsModule, NgbInputDatepicker],
})
export class ShiftAssignmentUpdate implements OnInit {
  readonly isSaving = signal(false);
  shiftAssignment: IShiftAssignment | null = null;
  shiftTypeValues = Object.keys(ShiftType);

  rosterWeeksSharedCollection = signal<IRosterWeek[]>([]);
  professionalsSharedCollection = signal<IProfessional[]>([]);

  protected shiftAssignmentService = inject(ShiftAssignmentService);
  protected shiftAssignmentFormService = inject(ShiftAssignmentFormService);
  protected rosterWeekService = inject(RosterWeekService);
  protected professionalService = inject(ProfessionalService);
  protected activatedRoute = inject(ActivatedRoute);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  editForm: ShiftAssignmentFormGroup = this.shiftAssignmentFormService.createShiftAssignmentFormGroup();

  compareRosterWeek = (o1: IRosterWeek | null, o2: IRosterWeek | null): boolean => this.rosterWeekService.compareRosterWeek(o1, o2);

  compareProfessional = (o1: IProfessional | null, o2: IProfessional | null): boolean =>
    this.professionalService.compareProfessional(o1, o2);

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(({ shiftAssignment }) => {
      this.shiftAssignment = shiftAssignment;
      if (shiftAssignment) {
        this.updateForm(shiftAssignment);
      }

      this.loadRelationshipsOptions();
    });
  }

  previousState(): void {
    globalThis.history.back();
  }

  save(): void {
    this.isSaving.set(true);
    const shiftAssignment = this.shiftAssignmentFormService.getShiftAssignment(this.editForm);
    if (shiftAssignment.id === null) {
      this.subscribeToSaveResponse(this.shiftAssignmentService.create(shiftAssignment));
    } else {
      this.subscribeToSaveResponse(this.shiftAssignmentService.update(shiftAssignment));
    }
  }

  protected subscribeToSaveResponse(result: Observable<IShiftAssignment | null>): void {
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

  protected updateForm(shiftAssignment: IShiftAssignment): void {
    this.shiftAssignment = shiftAssignment;
    this.shiftAssignmentFormService.resetForm(this.editForm, shiftAssignment);

    this.rosterWeeksSharedCollection.update(rosterWeeks =>
      this.rosterWeekService.addRosterWeekToCollectionIfMissing<IRosterWeek>(rosterWeeks, shiftAssignment.week),
    );
    this.professionalsSharedCollection.update(professionals =>
      this.professionalService.addProfessionalToCollectionIfMissing<IProfessional>(professionals, shiftAssignment.professional),
    );
  }

  protected loadRelationshipsOptions(): void {
    this.rosterWeekService
      .query()
      .pipe(map((res: HttpResponse<IRosterWeek[]>) => res.body ?? []))
      .pipe(
        map((rosterWeeks: IRosterWeek[]) =>
          this.rosterWeekService.addRosterWeekToCollectionIfMissing<IRosterWeek>(rosterWeeks, this.shiftAssignment?.week),
        ),
      )
      .subscribe((rosterWeeks: IRosterWeek[]) => this.rosterWeeksSharedCollection.set(rosterWeeks));

    this.professionalService
      .query()
      .pipe(map((res: HttpResponse<IProfessional[]>) => res.body ?? []))
      .pipe(
        map((professionals: IProfessional[]) =>
          this.professionalService.addProfessionalToCollectionIfMissing<IProfessional>(professionals, this.shiftAssignment?.professional),
        ),
      )
      .subscribe((professionals: IProfessional[]) => this.professionalsSharedCollection.set(professionals));
  }
}
