import { HttpResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgbInputDatepicker } from '@ng-bootstrap/ng-bootstrap/datepicker';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable, finalize, map } from 'rxjs';

import { IProfile } from 'app/entities/directory/profile/profile.model';
import { ProfileService } from 'app/entities/directory/profile/service/profile.service';
import { AccountStatus } from 'app/entities/enumerations/account-status.model';
import { ProfessionalRole } from 'app/entities/enumerations/professional-role.model';
import { ICredential } from 'app/entities/platform/credential/credential.model';
import { AlertError } from 'app/shared/alert/alert-error';
import { TranslateDirective } from 'app/shared/language';

import { IProfessional } from '../professional.model';
import { ProfessionalService } from '../service/professional.service';

import { ProfessionalFormGroup, ProfessionalFormService } from './professional-form.service';
import { CredentialService } from 'app/entities/platform/credential/service/credential.service';
import { ITeam } from 'app/entities/platform/team/team.model';
import { TeamService } from 'app/entities/platform/team/service/team.service';
import { IHub } from 'app/entities/platform/hub/hub.model';
import { HubService } from 'app/entities/platform/hub/service/hub.service';
import { VerificationStatus } from 'app/entities/enumerations/verification-status.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'abf-professional-update',
  templateUrl: './professional-update.html',
  imports: [TranslateDirective, TranslatePipe, FontAwesomeModule, AlertError, ReactiveFormsModule, NgbInputDatepicker],
})
export class ProfessionalUpdate implements OnInit {
  readonly isSaving = signal(false);
  professional: IProfessional | null = null;
  professionalRoleValues = Object.keys(ProfessionalRole);
  verificationStatusValues = Object.keys(VerificationStatus);
  accountStatusValues = Object.keys(AccountStatus);

  profilesCollection = signal<IProfile[]>([]);
  credentialsCollection = signal<ICredential[]>([]);
  teamsSharedCollection = signal<ITeam[]>([]);
  hubsSharedCollection = signal<IHub[]>([]);

  protected professionalService = inject(ProfessionalService);
  protected professionalFormService = inject(ProfessionalFormService);
  protected profileService = inject(ProfileService);
  protected credentialService = inject(CredentialService);
  protected teamService = inject(TeamService);
  protected hubService = inject(HubService);
  protected activatedRoute = inject(ActivatedRoute);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  editForm: ProfessionalFormGroup = this.professionalFormService.createProfessionalFormGroup();

  compareProfile = (o1: IProfile | null, o2: IProfile | null): boolean => this.profileService.compareProfile(o1, o2);

  compareCredential = (o1: ICredential | null, o2: ICredential | null): boolean => this.credentialService.compareCredential(o1, o2);

  compareTeam = (o1: ITeam | null, o2: ITeam | null): boolean => this.teamService.compareTeam(o1, o2);

  compareHub = (o1: IHub | null, o2: IHub | null): boolean => this.hubService.compareHub(o1, o2);

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(({ professional }) => {
      this.professional = professional;
      if (professional) {
        this.updateForm(professional);
      }

      this.loadRelationshipsOptions();
    });
  }

  previousState(): void {
    globalThis.history.back();
  }

  save(): void {
    this.isSaving.set(true);
    const professional = this.professionalFormService.getProfessional(this.editForm);
    if (professional.id === null) {
      this.subscribeToSaveResponse(this.professionalService.create(professional));
    } else {
      this.subscribeToSaveResponse(this.professionalService.update(professional));
    }
  }

  protected subscribeToSaveResponse(result: Observable<IProfessional | null>): void {
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

  protected updateForm(professional: IProfessional): void {
    this.professional = professional;
    this.professionalFormService.resetForm(this.editForm, professional);

    this.profilesCollection.set(
      this.profileService.addProfileToCollectionIfMissing<IProfile>(this.profilesCollection(), professional.profile),
    );
    this.credentialsCollection.set(
      this.credentialService.addCredentialToCollectionIfMissing<ICredential>(this.credentialsCollection(), professional.credential),
    );
    this.teamsSharedCollection.update(teams => this.teamService.addTeamToCollectionIfMissing<ITeam>(teams, professional.team));
    this.hubsSharedCollection.update(hubs => this.hubService.addHubToCollectionIfMissing<IHub>(hubs, professional.hub));
  }

  protected loadRelationshipsOptions(): void {
    this.profileService
      .query({ filter: 'professional-is-null' })
      .pipe(map((res: HttpResponse<IProfile[]>) => res.body ?? []))
      .pipe(
        map((profiles: IProfile[]) => this.profileService.addProfileToCollectionIfMissing<IProfile>(profiles, this.professional?.profile)),
      )
      .subscribe((profiles: IProfile[]) => this.profilesCollection.set(profiles));

    this.credentialService
      .query({ filter: 'professional-is-null' })
      .pipe(map((res: HttpResponse<ICredential[]>) => res.body ?? []))
      .pipe(
        map((credentials: ICredential[]) =>
          this.credentialService.addCredentialToCollectionIfMissing<ICredential>(credentials, this.professional?.credential),
        ),
      )
      .subscribe((credentials: ICredential[]) => this.credentialsCollection.set(credentials));

    this.teamService
      .query()
      .pipe(map((res: HttpResponse<ITeam[]>) => res.body ?? []))
      .pipe(map((teams: ITeam[]) => this.teamService.addTeamToCollectionIfMissing<ITeam>(teams, this.professional?.team)))
      .subscribe((teams: ITeam[]) => this.teamsSharedCollection.set(teams));

    this.hubService
      .query()
      .pipe(map((res: HttpResponse<IHub[]>) => res.body ?? []))
      .pipe(map((hubs: IHub[]) => this.hubService.addHubToCollectionIfMissing<IHub>(hubs, this.professional?.hub)))
      .subscribe((hubs: IHub[]) => this.hubsSharedCollection.set(hubs));
  }
}
