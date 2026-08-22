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
import { IdType } from 'app/entities/enumerations/id-type.model';
import { Sex } from 'app/entities/enumerations/sex.model';
import { Title } from 'app/entities/enumerations/title.model';
import { AlertError } from 'app/shared/alert/alert-error';
import { TranslateDirective } from 'app/shared/language';

import { IProfile } from '../profile.model';
import { ProfileService } from '../service/profile.service';

import { ProfileFormGroup, ProfileFormService } from './profile-form.service';
import RecordLabelPipe from 'app/shared/format/record-label.pipe';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'abf-profile-update',
  templateUrl: './profile-update.html',
  imports: [RecordLabelPipe, TranslateDirective, TranslatePipe, FontAwesomeModule, AlertError, ReactiveFormsModule, NgbInputDatepicker],
})
export class ProfileUpdate implements OnInit {
  readonly isSaving = signal(false);
  profile: IProfile | null = null;
  titleValues = Object.keys(Title);
  sexValues = Object.keys(Sex);
  idTypeValues = Object.keys(IdType);

  addressesCollection = signal<IAddress[]>([]);

  protected profileService = inject(ProfileService);
  protected profileFormService = inject(ProfileFormService);
  protected addressService = inject(AddressService);
  protected activatedRoute = inject(ActivatedRoute);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  editForm: ProfileFormGroup = this.profileFormService.createProfileFormGroup();

  compareAddress = (o1: IAddress | null, o2: IAddress | null): boolean => this.addressService.compareAddress(o1, o2);

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(({ profile }) => {
      this.profile = profile;
      if (profile) {
        this.updateForm(profile);
      }

      this.loadRelationshipsOptions();
    });
  }

  previousState(): void {
    globalThis.history.back();
  }

  save(): void {
    this.isSaving.set(true);
    const profile = this.profileFormService.getProfile(this.editForm);
    if (profile.id === null) {
      this.subscribeToSaveResponse(this.profileService.create(profile));
    } else {
      this.subscribeToSaveResponse(this.profileService.update(profile));
    }
  }

  protected subscribeToSaveResponse(result: Observable<IProfile | null>): void {
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

  protected updateForm(profile: IProfile): void {
    this.profile = profile;
    this.profileFormService.resetForm(this.editForm, profile);

    this.addressesCollection.set(
      this.addressService.addAddressToCollectionIfMissing<IAddress>(this.addressesCollection(), profile.address),
    );
  }

  protected loadRelationshipsOptions(): void {
    this.addressService
      .query({ filter: 'profile-is-null' })
      .pipe(map((res: HttpResponse<IAddress[]>) => res.body ?? []))
      .pipe(map((addresses: IAddress[]) => this.addressService.addAddressToCollectionIfMissing<IAddress>(addresses, this.profile?.address)))
      .subscribe((addresses: IAddress[]) => this.addressesCollection.set(addresses));
  }
}
