import { HttpResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgbInputDatepicker } from '@ng-bootstrap/ng-bootstrap/datepicker';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable, finalize, map } from 'rxjs';

import { IAddress } from 'app/entities/directory/address/address.model';
import { AddressService } from 'app/entities/directory/address/service/address.service';
import { AlertError } from 'app/shared/alert/alert-error';
import { TranslateDirective } from 'app/shared/language';
import { IOrganisation } from '../organisation.model';
import { OrganisationService } from '../service/organisation.service';

import { OrganisationFormGroup, OrganisationFormService } from './organisation-form.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'abf-organisation-update',
  templateUrl: './organisation-update.html',
  imports: [TranslateDirective, TranslatePipe, FontAwesomeModule, AlertError, ReactiveFormsModule, NgbInputDatepicker],
})
export class OrganisationUpdate implements OnInit {
  readonly isSaving = signal(false);
  organisation: IOrganisation | null = null;

  addressesCollection = signal<IAddress[]>([]);

  protected organisationService = inject(OrganisationService);
  protected organisationFormService = inject(OrganisationFormService);
  protected addressService = inject(AddressService);
  protected activatedRoute = inject(ActivatedRoute);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  editForm: OrganisationFormGroup = this.organisationFormService.createOrganisationFormGroup();

  compareAddress = (o1: IAddress | null, o2: IAddress | null): boolean => this.addressService.compareAddress(o1, o2);

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(({ organisation }) => {
      this.organisation = organisation;
      if (organisation) {
        this.updateForm(organisation);
      }

      this.loadRelationshipsOptions();
    });
  }

  previousState(): void {
    globalThis.history.back();
  }

  save(): void {
    this.isSaving.set(true);
    const organisation = this.organisationFormService.getOrganisation(this.editForm);
    if (organisation.id === null) {
      this.subscribeToSaveResponse(this.organisationService.create(organisation));
    } else {
      this.subscribeToSaveResponse(this.organisationService.update(organisation));
    }
  }

  protected subscribeToSaveResponse(result: Observable<IOrganisation | null>): void {
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

  protected updateForm(organisation: IOrganisation): void {
    this.organisation = organisation;
    this.organisationFormService.resetForm(this.editForm, organisation);

    this.addressesCollection.set(
      this.addressService.addAddressToCollectionIfMissing<IAddress>(this.addressesCollection(), organisation.address),
    );
  }

  protected loadRelationshipsOptions(): void {
    this.addressService
      .query({ filter: 'organisation-is-null' })
      .pipe(map((res: HttpResponse<IAddress[]>) => res.body ?? []))
      .pipe(
        map((addresses: IAddress[]) =>
          this.addressService.addAddressToCollectionIfMissing<IAddress>(addresses, this.organisation?.address),
        ),
      )
      .subscribe((addresses: IAddress[]) => this.addressesCollection.set(addresses));
  }
}
