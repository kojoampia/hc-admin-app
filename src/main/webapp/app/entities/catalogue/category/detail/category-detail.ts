import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslatePipe } from '@ngx-translate/core';

import { Alert } from 'app/shared/alert/alert';
import { AlertError } from 'app/shared/alert/alert-error';
import { TranslateDirective } from 'app/shared/language';
import { ICategory } from '../category.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'abf-category-detail',
  templateUrl: './category-detail.html',
  imports: [FontAwesomeModule, Alert, AlertError, TranslateDirective, TranslatePipe, RouterLink],
})
export class CategoryDetail {
  readonly category = input<ICategory | null>(null);

  previousState(): void {
    globalThis.history.back();
  }
}
