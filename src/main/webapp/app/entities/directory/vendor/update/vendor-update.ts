import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgbInputDatepicker } from '@ng-bootstrap/ng-bootstrap/datepicker';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable, finalize } from 'rxjs';

import { AccountStatus } from 'app/entities/enumerations/account-status.model';
import { AlertError } from 'app/shared/alert/alert-error';
import { TranslateDirective } from 'app/shared/language';
import { VendorService } from '../service/vendor.service';
import { IVendor } from '../vendor.model';

import { VendorFormGroup, VendorFormService } from './vendor-form.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'abf-vendor-update',
  templateUrl: './vendor-update.html',
  imports: [TranslateDirective, TranslatePipe, FontAwesomeModule, AlertError, ReactiveFormsModule, NgbInputDatepicker],
})
export class VendorUpdate implements OnInit {
  readonly isSaving = signal(false);
  vendor: IVendor | null = null;
  accountStatusValues = Object.keys(AccountStatus);

  protected vendorService = inject(VendorService);
  protected vendorFormService = inject(VendorFormService);
  protected activatedRoute = inject(ActivatedRoute);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  editForm: VendorFormGroup = this.vendorFormService.createVendorFormGroup();

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(({ vendor }) => {
      this.vendor = vendor;
      if (vendor) {
        this.updateForm(vendor);
      }
    });
  }

  previousState(): void {
    globalThis.history.back();
  }

  save(): void {
    this.isSaving.set(true);
    const vendor = this.vendorFormService.getVendor(this.editForm);
    if (vendor.id === null) {
      this.subscribeToSaveResponse(this.vendorService.create(vendor));
    } else {
      this.subscribeToSaveResponse(this.vendorService.update(vendor));
    }
  }

  protected subscribeToSaveResponse(result: Observable<IVendor | null>): void {
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

  protected updateForm(vendor: IVendor): void {
    this.vendor = vendor;
    this.vendorFormService.resetForm(this.editForm, vendor);
  }
}
