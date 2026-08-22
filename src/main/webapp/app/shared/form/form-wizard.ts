import { signal } from '@angular/core';
import { AbstractControl, FormGroup } from '@angular/forms';

/** One step of a wizard: what to call it, and which controls it is responsible for. */
export interface WizardStep {
  /** i18n key for the step label. */
  readonly label: string;
  /** Control names this step shows. Validity of these gates leaving it. */
  readonly controls: readonly string[];
}

/**
 * The state behind a stepwise form: which step is showing, and whether it may be left.
 *
 * <p><b>The gating is the point.</b> A wizard whose Next button always advances is one long form
 * with the middle hidden: errors accumulate out of sight and surface at the end, attached to fields
 * the person stopped looking at three steps ago. So `next()` refuses while the current step's own
 * controls are invalid, and marks them touched on the way out so the reason is visible rather than
 * silent.
 *
 * <p>Deliberately a plain class over a `FormGroup` rather than a component. The five forms it serves
 * are generated templates whose fields are laid out by JHipster; wrapping them in a component's
 * content projection would mean restructuring each one, while a class beside the existing form
 * needs only the field groups wrapped in `@if` blocks.
 */
export class FormWizard {
  readonly step = signal(0);

  constructor(
    private readonly form: FormGroup,
    readonly steps: readonly WizardStep[],
  ) {}

  isFirst(): boolean {
    return this.step() === 0;
  }

  isLast(): boolean {
    return this.step() === this.steps.length - 1;
  }

  /** True when every control on the step is valid, so the step may be left. */
  isStepValid(index = this.step()): boolean {
    return this.controlsOf(index).every(control => control.valid);
  }

  /**
   * Advance, or refuse and show why.
   *
   * @returns whether the step actually changed.
   */
  next(): boolean {
    if (!this.isStepValid()) {
      this.revealErrors(this.step());
      return false;
    }
    if (this.isLast()) {
      return false;
    }
    this.step.update(current => current + 1);
    return true;
  }

  previous(): void {
    // No validity check going back. Somebody correcting an earlier answer should not have to
    // satisfy the step they are standing on to reach it.
    this.step.update(current => Math.max(0, current - 1));
  }

  /**
   * Jump straight to a step from the rail.
   *
   * <p>Backwards is always allowed. Forwards is allowed only across steps that are already valid —
   * skipping a required field by clicking past it is the same hole as a Next button that never
   * refuses.
   */
  goTo(index: number): void {
    if (index < 0 || index >= this.steps.length) {
      return;
    }
    if (index <= this.step()) {
      this.step.set(index);
      return;
    }
    for (let step = this.step(); step < index; step++) {
      if (!this.isStepValid(step)) {
        this.revealErrors(step);
        this.step.set(step);
        return;
      }
    }
    this.step.set(index);
  }

  /** Which steps are complete, for the rail's ticks. */
  completed(): boolean[] {
    return this.steps.map((_, index) => this.isStepValid(index));
  }

  /**
   * Show the errors on a step the person is being held on.
   *
   * <p>Angular hides a control's error until it is touched, which is right while somebody is still
   * filling a form in and wrong the moment they are refused: the field they never reached is
   * exactly the one they need to see.
   */
  private revealErrors(index: number): void {
    this.controlsOf(index).forEach(control => control.markAsTouched());
  }

  private controlsOf(index: number): AbstractControl[] {
    return (this.steps[index]?.controls ?? [])
      .map(name => this.form.get(name))
      .filter((control): control is AbstractControl => control !== null);
  }
}
