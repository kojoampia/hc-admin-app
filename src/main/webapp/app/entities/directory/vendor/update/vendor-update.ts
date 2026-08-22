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
import { FormWizard } from 'app/shared/form/form-wizard';
import WizardSteps from 'app/shared/form/wizard-steps';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'abf-vendor-update',
  templateUrl: './vendor-update.html',
  imports: [WizardSteps, TranslateDirective, TranslatePipe, FontAwesomeModule, AlertError, ReactiveFormsModule, NgbInputDatepicker],
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

  /**
   * The form in steps, grouped by what the fields are about rather than by how many fit.
   *
   * <p>The grouping is the useful part: a step is a question somebody can answer in one
   * sitting, and the control names below are what gates leaving it — see {@link FormWizard},
   * which refuses to advance past an invalid step rather than saving up the errors for the end.
   */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly wizard = new FormWizard(this.editForm, [
    {
      label: 'hcAdminApp.directoryVendor.step.business',
      controls: ['name', 'category', 'serviceSummary', 'contactName', 'phone', 'email', 'city'],
    },
    { label: 'hcAdminApp.directoryVendor.step.contract', controls: ['status', 'contractNote', 'contractRenewsOn'] },
    { label: 'hcAdminApp.directoryVendor.step.trading', controls: ['orderCount', 'spendToDate', 'rating'] },
  ]);

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
