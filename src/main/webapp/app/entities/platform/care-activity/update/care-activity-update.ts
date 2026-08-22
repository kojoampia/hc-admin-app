import { HttpResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgbInputDatepicker } from '@ng-bootstrap/ng-bootstrap/datepicker';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable, finalize, map } from 'rxjs';

import { RELATIONSHIP_OPTIONS_PAGE_SIZE } from 'app/config/pagination.constants';
import { IPatient } from 'app/entities/directory/patient/patient.model';
import { PatientService } from 'app/entities/directory/patient/service/patient.service';
import { AlertError } from 'app/shared/alert/alert-error';
import { TranslateDirective } from 'app/shared/language';
import { ICareActivity } from '../care-activity.model';
import { CareActivityService } from '../service/care-activity.service';

import { CareActivityFormGroup, CareActivityFormService } from './care-activity-form.service';
import RecordLabelPipe from 'app/shared/format/record-label.pipe';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'abf-care-activity-update',
  templateUrl: './care-activity-update.html',
  imports: [RecordLabelPipe, TranslateDirective, TranslatePipe, FontAwesomeModule, AlertError, ReactiveFormsModule, NgbInputDatepicker],
})
export class CareActivityUpdate implements OnInit {
  readonly isSaving = signal(false);
  careActivity: ICareActivity | null = null;

  patientsSharedCollection = signal<IPatient[]>([]);

  protected careActivityService = inject(CareActivityService);
  protected careActivityFormService = inject(CareActivityFormService);
  protected patientService = inject(PatientService);
  protected activatedRoute = inject(ActivatedRoute);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  editForm: CareActivityFormGroup = this.careActivityFormService.createCareActivityFormGroup();

  comparePatient = (o1: IPatient | null, o2: IPatient | null): boolean => this.patientService.comparePatient(o1, o2);

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(({ careActivity }) => {
      this.careActivity = careActivity;
      if (careActivity) {
        this.updateForm(careActivity);
      }

      this.loadRelationshipsOptions();
    });
  }

  previousState(): void {
    globalThis.history.back();
  }

  save(): void {
    this.isSaving.set(true);
    const careActivity = this.careActivityFormService.getCareActivity(this.editForm);
    if (careActivity.id === null) {
      this.subscribeToSaveResponse(this.careActivityService.create(careActivity));
    } else {
      this.subscribeToSaveResponse(this.careActivityService.update(careActivity));
    }
  }

  protected subscribeToSaveResponse(result: Observable<ICareActivity | null>): void {
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

  protected updateForm(careActivity: ICareActivity): void {
    this.careActivity = careActivity;
    this.careActivityFormService.resetForm(this.editForm, careActivity);

    this.patientsSharedCollection.update(patients =>
      this.patientService.addPatientToCollectionIfMissing<IPatient>(patients, careActivity.patient),
    );
  }

  protected loadRelationshipsOptions(): void {
    this.patientService
      .query({ size: RELATIONSHIP_OPTIONS_PAGE_SIZE })
      .pipe(map((res: HttpResponse<IPatient[]>) => res.body ?? []))
      .pipe(
        map((patients: IPatient[]) => this.patientService.addPatientToCollectionIfMissing<IPatient>(patients, this.careActivity?.patient)),
      )
      .subscribe((patients: IPatient[]) => this.patientsSharedCollection.set(patients));
  }
}
