import { HttpResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgbInputDatepicker } from '@ng-bootstrap/ng-bootstrap/datepicker';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable, finalize, map } from 'rxjs';

import { ServicePlanService } from 'app/entities/catalogue/service-plan/service/service-plan.service';
import { IServicePlan } from 'app/entities/catalogue/service-plan/service-plan.model';
import { IAngel } from 'app/entities/directory/angel/angel.model';
import { AngelService } from 'app/entities/directory/angel/service/angel.service';
import { IProfessional } from 'app/entities/directory/professional/professional.model';
import { ProfessionalService } from 'app/entities/directory/professional/service/professional.service';
import { IProfile } from 'app/entities/directory/profile/profile.model';
import { ProfileService } from 'app/entities/directory/profile/service/profile.service';
import { AccountStatus } from 'app/entities/enumerations/account-status.model';
import { IHub } from 'app/entities/platform/hub/hub.model';
import { HubService } from 'app/entities/platform/hub/service/hub.service';
import { AlertError } from 'app/shared/alert/alert-error';
import { TranslateDirective } from 'app/shared/language';
import { IPatient } from '../patient.model';
import { PatientService } from '../service/patient.service';

import { PatientFormGroup, PatientFormService } from './patient-form.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'abf-patient-update',
  templateUrl: './patient-update.html',
  imports: [TranslateDirective, TranslatePipe, FontAwesomeModule, AlertError, ReactiveFormsModule, NgbInputDatepicker],
})
export class PatientUpdate implements OnInit {
  readonly isSaving = signal(false);
  patient: IPatient | null = null;
  accountStatusValues = Object.keys(AccountStatus);

  profilesCollection = signal<IProfile[]>([]);
  angelsCollection = signal<IAngel[]>([]);
  servicePlansSharedCollection = signal<IServicePlan[]>([]);
  professionalsSharedCollection = signal<IProfessional[]>([]);
  hubsSharedCollection = signal<IHub[]>([]);

  protected patientService = inject(PatientService);
  protected patientFormService = inject(PatientFormService);
  protected profileService = inject(ProfileService);
  protected angelService = inject(AngelService);
  protected servicePlanService = inject(ServicePlanService);
  protected professionalService = inject(ProfessionalService);
  protected hubService = inject(HubService);
  protected activatedRoute = inject(ActivatedRoute);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  editForm: PatientFormGroup = this.patientFormService.createPatientFormGroup();

  compareProfile = (o1: IProfile | null, o2: IProfile | null): boolean => this.profileService.compareProfile(o1, o2);

  compareAngel = (o1: IAngel | null, o2: IAngel | null): boolean => this.angelService.compareAngel(o1, o2);

  compareServicePlan = (o1: IServicePlan | null, o2: IServicePlan | null): boolean => this.servicePlanService.compareServicePlan(o1, o2);

  compareProfessional = (o1: IProfessional | null, o2: IProfessional | null): boolean =>
    this.professionalService.compareProfessional(o1, o2);

  compareHub = (o1: IHub | null, o2: IHub | null): boolean => this.hubService.compareHub(o1, o2);

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(({ patient }) => {
      this.patient = patient;
      if (patient) {
        this.updateForm(patient);
      }

      this.loadRelationshipsOptions();
    });
  }

  previousState(): void {
    globalThis.history.back();
  }

  save(): void {
    this.isSaving.set(true);
    const patient = this.patientFormService.getPatient(this.editForm);
    if (patient.id === null) {
      this.subscribeToSaveResponse(this.patientService.create(patient));
    } else {
      this.subscribeToSaveResponse(this.patientService.update(patient));
    }
  }

  protected subscribeToSaveResponse(result: Observable<IPatient | null>): void {
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

  protected updateForm(patient: IPatient): void {
    this.patient = patient;
    this.patientFormService.resetForm(this.editForm, patient);

    this.profilesCollection.set(this.profileService.addProfileToCollectionIfMissing<IProfile>(this.profilesCollection(), patient.profile));
    this.angelsCollection.set(this.angelService.addAngelToCollectionIfMissing<IAngel>(this.angelsCollection(), patient.angel));
    this.servicePlansSharedCollection.update(servicePlans =>
      this.servicePlanService.addServicePlanToCollectionIfMissing<IServicePlan>(servicePlans, patient.plan),
    );
    this.professionalsSharedCollection.update(professionals =>
      this.professionalService.addProfessionalToCollectionIfMissing<IProfessional>(professionals, patient.clinicalLead),
    );
    this.hubsSharedCollection.update(hubs => this.hubService.addHubToCollectionIfMissing<IHub>(hubs, patient.hub));
  }

  protected loadRelationshipsOptions(): void {
    this.profileService
      .query({ filter: 'patient-is-null' })
      .pipe(map((res: HttpResponse<IProfile[]>) => res.body ?? []))
      .pipe(map((profiles: IProfile[]) => this.profileService.addProfileToCollectionIfMissing<IProfile>(profiles, this.patient?.profile)))
      .subscribe((profiles: IProfile[]) => this.profilesCollection.set(profiles));

    this.angelService
      .query({ filter: 'patient-is-null' })
      .pipe(map((res: HttpResponse<IAngel[]>) => res.body ?? []))
      .pipe(map((angels: IAngel[]) => this.angelService.addAngelToCollectionIfMissing<IAngel>(angels, this.patient?.angel)))
      .subscribe((angels: IAngel[]) => this.angelsCollection.set(angels));

    this.servicePlanService
      .query()
      .pipe(map((res: HttpResponse<IServicePlan[]>) => res.body ?? []))
      .pipe(
        map((servicePlans: IServicePlan[]) =>
          this.servicePlanService.addServicePlanToCollectionIfMissing<IServicePlan>(servicePlans, this.patient?.plan),
        ),
      )
      .subscribe((servicePlans: IServicePlan[]) => this.servicePlansSharedCollection.set(servicePlans));

    this.professionalService
      .query()
      .pipe(map((res: HttpResponse<IProfessional[]>) => res.body ?? []))
      .pipe(
        map((professionals: IProfessional[]) =>
          this.professionalService.addProfessionalToCollectionIfMissing<IProfessional>(professionals, this.patient?.clinicalLead),
        ),
      )
      .subscribe((professionals: IProfessional[]) => this.professionalsSharedCollection.set(professionals));

    this.hubService
      .query()
      .pipe(map((res: HttpResponse<IHub[]>) => res.body ?? []))
      .pipe(map((hubs: IHub[]) => this.hubService.addHubToCollectionIfMissing<IHub>(hubs, this.patient?.hub)))
      .subscribe((hubs: IHub[]) => this.hubsSharedCollection.set(hubs));
  }
}
