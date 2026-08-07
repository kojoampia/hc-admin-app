import { HttpResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable, finalize, map } from 'rxjs';

import { IAddress } from 'app/entities/directory/address/address.model';
import { AddressService } from 'app/entities/directory/address/service/address.service';
import { AlertError } from 'app/shared/alert/alert-error';
import { TranslateDirective } from 'app/shared/language';
import { IHub } from '../hub.model';
import { HubService } from '../service/hub.service';

import { HubFormGroup, HubFormService } from './hub-form.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'abf-hub-update',
  templateUrl: './hub-update.html',
  imports: [TranslateDirective, TranslatePipe, FontAwesomeModule, AlertError, ReactiveFormsModule],
})
export class HubUpdate implements OnInit {
  readonly isSaving = signal(false);
  hub: IHub | null = null;

  addressesCollection = signal<IAddress[]>([]);

  protected hubService = inject(HubService);
  protected hubFormService = inject(HubFormService);
  protected addressService = inject(AddressService);
  protected activatedRoute = inject(ActivatedRoute);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  editForm: HubFormGroup = this.hubFormService.createHubFormGroup();

  compareAddress = (o1: IAddress | null, o2: IAddress | null): boolean => this.addressService.compareAddress(o1, o2);

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(({ hub }) => {
      this.hub = hub;
      if (hub) {
        this.updateForm(hub);
      }

      this.loadRelationshipsOptions();
    });
  }

  previousState(): void {
    globalThis.history.back();
  }

  save(): void {
    this.isSaving.set(true);
    const hub = this.hubFormService.getHub(this.editForm);
    if (hub.id === null) {
      this.subscribeToSaveResponse(this.hubService.create(hub));
    } else {
      this.subscribeToSaveResponse(this.hubService.update(hub));
    }
  }

  protected subscribeToSaveResponse(result: Observable<IHub | null>): void {
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

  protected updateForm(hub: IHub): void {
    this.hub = hub;
    this.hubFormService.resetForm(this.editForm, hub);

    this.addressesCollection.set(this.addressService.addAddressToCollectionIfMissing<IAddress>(this.addressesCollection(), hub.address));
  }

  protected loadRelationshipsOptions(): void {
    this.addressService
      .query({ filter: 'hub-is-null' })
      .pipe(map((res: HttpResponse<IAddress[]>) => res.body ?? []))
      .pipe(map((addresses: IAddress[]) => this.addressService.addAddressToCollectionIfMissing<IAddress>(addresses, this.hub?.address)))
      .subscribe((addresses: IAddress[]) => this.addressesCollection.set(addresses));
  }
}
