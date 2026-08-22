import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslatePipe } from '@ngx-translate/core';

import { WizardStep } from './form-wizard';

/**
 * The rail across the top of a stepwise form: where you are, what is done, what is left.
 *
 * <p>Rendered as buttons rather than as decoration, because a wizard whose steps cannot be revisited
 * makes a person restart to fix a typo three steps back. Which jumps are allowed is
 * {@link FormWizard.goTo}'s business — backwards always, forwards only across steps already valid.
 */
@Component({
  selector: 'abf-wizard-steps',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FontAwesomeModule, TranslatePipe],
  template: `
    <ol class="abf-steps" data-cy="wizardSteps">
      @for (step of steps(); track step.label; let index = $index, isLast = $last) {
        <li class="abf-steps__item" [class.on]="index === current()" [class.done]="completed()[index] && index !== current()">
          <button type="button" class="abf-steps__button" (click)="stepSelect.emit(index)" [attr.data-cy]="'wizardStep-' + index">
            <span class="abf-steps__marker">
              @if (completed()[index] && index !== current()) {
                <fa-icon icon="check" />
              } @else {
                {{ index + 1 }}
              }
            </span>
            <span class="abf-steps__label">{{ step.label | translate }}</span>
          </button>
          @if (!isLast) {
            <span class="abf-steps__rule" aria-hidden="true"></span>
          }
        </li>
      }
    </ol>
  `,
})
export default class WizardSteps {
  readonly steps = input.required<readonly WizardStep[]>();
  readonly current = input.required<number>();
  readonly completed = input.required<boolean[]>();
  readonly stepSelect = output<number>();
}
