import { HttpResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable, finalize, map } from 'rxjs';

import { RELATIONSHIP_OPTIONS_PAGE_SIZE } from 'app/config/pagination.constants';
import { IProfessional } from 'app/entities/directory/professional/professional.model';
import { ProfessionalService } from 'app/entities/directory/professional/service/professional.service';
import { AlertError } from 'app/shared/alert/alert-error';
import { TranslateDirective } from 'app/shared/language';
import { TeamService } from '../service/team.service';
import { ITeam } from '../team.model';

import { TeamFormGroup, TeamFormService } from './team-form.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'abf-team-update',
  templateUrl: './team-update.html',
  imports: [TranslateDirective, TranslatePipe, FontAwesomeModule, AlertError, ReactiveFormsModule],
})
export class TeamUpdate implements OnInit {
  readonly isSaving = signal(false);
  team: ITeam | null = null;

  professionalsSharedCollection = signal<IProfessional[]>([]);

  protected teamService = inject(TeamService);
  protected teamFormService = inject(TeamFormService);
  protected professionalService = inject(ProfessionalService);
  protected activatedRoute = inject(ActivatedRoute);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  editForm: TeamFormGroup = this.teamFormService.createTeamFormGroup();

  compareProfessional = (o1: IProfessional | null, o2: IProfessional | null): boolean =>
    this.professionalService.compareProfessional(o1, o2);

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(({ team }) => {
      this.team = team;
      if (team) {
        this.updateForm(team);
      }

      this.loadRelationshipsOptions();
    });
  }

  previousState(): void {
    globalThis.history.back();
  }

  save(): void {
    this.isSaving.set(true);
    const team = this.teamFormService.getTeam(this.editForm);
    if (team.id === null) {
      this.subscribeToSaveResponse(this.teamService.create(team));
    } else {
      this.subscribeToSaveResponse(this.teamService.update(team));
    }
  }

  protected subscribeToSaveResponse(result: Observable<ITeam | null>): void {
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

  protected updateForm(team: ITeam): void {
    this.team = team;
    this.teamFormService.resetForm(this.editForm, team);

    this.professionalsSharedCollection.update(professionals =>
      this.professionalService.addProfessionalToCollectionIfMissing<IProfessional>(professionals, team.supervisor),
    );
  }

  protected loadRelationshipsOptions(): void {
    this.professionalService
      .query({ size: RELATIONSHIP_OPTIONS_PAGE_SIZE })
      .pipe(map((res: HttpResponse<IProfessional[]>) => res.body ?? []))
      .pipe(
        map((professionals: IProfessional[]) =>
          this.professionalService.addProfessionalToCollectionIfMissing<IProfessional>(professionals, this.team?.supervisor),
        ),
      )
      .subscribe((professionals: IProfessional[]) => this.professionalsSharedCollection.set(professionals));
  }
}
