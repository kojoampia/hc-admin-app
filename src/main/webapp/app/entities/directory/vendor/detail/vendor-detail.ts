import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslatePipe } from '@ngx-translate/core';

import { Alert } from 'app/shared/alert/alert';
import { AlertError } from 'app/shared/alert/alert-error';
import { FormatMediumDatePipe } from 'app/shared/date';
import { TranslateDirective } from 'app/shared/language';
import { IVendor } from '../vendor.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'abf-vendor-detail',
  templateUrl: './vendor-detail.html',
  imports: [FontAwesomeModule, Alert, AlertError, TranslateDirective, TranslatePipe, RouterLink, FormatMediumDatePipe],
})
export class VendorDetail {
  readonly vendor = input<IVendor | null>(null);

  previousState(): void {
    globalThis.history.back();
  }
}
