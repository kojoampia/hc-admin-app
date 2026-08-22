import { beforeEach, describe, expect, it } from 'vitest';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import { FormWizard } from './form-wizard';

/**
 * When a wizard lets you move on, which is the only thing that distinguishes it from one long form
 * with the middle hidden.
 *
 * <p>A Next button that always advances is worse than no wizard at all: the errors still exist, they
 * are just out of sight until the end, attached to fields somebody stopped looking at three steps
 * ago. So the cases below are mostly about refusing — and about making the refusal visible, since
 * Angular hides a control's error until it is touched and the field nobody reached is exactly the
 * one they need to see.
 */
describe('FormWizard', () => {
  let form: FormGroup;
  let wizard: FormWizard;

  beforeEach(() => {
    form = new FormGroup({
      name: new FormControl('', Validators.required),
      category: new FormControl(''),
      status: new FormControl('', Validators.required),
      note: new FormControl(''),
      rating: new FormControl(''),
    });
    wizard = new FormWizard(form, [
      { label: 'step.one', controls: ['name', 'category'] },
      { label: 'step.two', controls: ['status', 'note'] },
      { label: 'step.three', controls: ['rating'] },
    ]);
  });

  it('starts on the first step', () => {
    expect(wizard.step()).toBe(0);
    expect(wizard.isFirst()).toBe(true);
    expect(wizard.isLast()).toBe(false);
  });

  it('refuses to advance while the current step is invalid', () => {
    expect(wizard.next()).toBe(false);
    expect(wizard.step()).toBe(0);
  });

  /** The refusal has to be legible, or it reads as a dead button. */
  it('marks the step touched when it refuses, so the error shows', () => {
    expect(form.controls.name.touched).toBe(false);

    wizard.next();

    expect(form.controls.name.touched).toBe(true);
  });

  it('advances once the step is satisfied', () => {
    form.controls.name.setValue('GoldStar Pharmacy');

    expect(wizard.next()).toBe(true);
    expect(wizard.step()).toBe(1);
  });

  /** A field on a later step must not hold up an earlier one. */
  it('judges only the controls on the current step', () => {
    form.controls.name.setValue('GoldStar Pharmacy');

    expect(wizard.isStepValid()).toBe(true);
    expect(form.valid).toBe(false);
  });

  /**
   * Going back is never gated.
   *
   * <p>Somebody correcting an earlier answer should not have to satisfy the step they are standing
   * on to reach it — that is how a typo becomes a restart.
   */
  it('always allows going back', () => {
    form.controls.name.setValue('GoldStar Pharmacy');
    wizard.next();

    wizard.previous();

    expect(wizard.step()).toBe(0);
  });

  it('does not run off either end', () => {
    wizard.previous();
    expect(wizard.step()).toBe(0);

    form.controls.name.setValue('x');
    wizard.next();
    form.controls.status.setValue('ACTIVE');
    wizard.next();
    expect(wizard.isLast()).toBe(true);

    expect(wizard.next()).toBe(false);
    expect(wizard.step()).toBe(2);
  });

  /** The rail can jump backwards freely. */
  it('jumps back to any earlier step', () => {
    form.controls.name.setValue('x');
    wizard.next();

    wizard.goTo(0);

    expect(wizard.step()).toBe(0);
  });

  /**
   * Forwards, it stops at the first step that is not satisfied.
   *
   * <p>Clicking past a required field on the rail is the same hole as a Next button that never
   * refuses, arrived at from a different direction.
   */
  it('stops a forward jump at the first unsatisfied step', () => {
    form.controls.name.setValue('x');

    wizard.goTo(2);

    expect(wizard.step()).toBe(1);
    expect(form.controls.status.touched).toBe(true);
  });

  it('lets a forward jump through when everything between is satisfied', () => {
    form.controls.name.setValue('x');
    form.controls.status.setValue('ACTIVE');

    wizard.goTo(2);

    expect(wizard.step()).toBe(2);
  });

  /** The rail's ticks. */
  it('reports which steps are complete', () => {
    expect(wizard.completed()).toEqual([false, false, true]);

    form.controls.name.setValue('x');

    expect(wizard.completed()).toEqual([true, false, true]);
  });

  /** A step naming a control the form does not have must not make the step impossible to leave. */
  it('ignores a control name the form does not carry', () => {
    const strays = new FormWizard(form, [
      { label: 'step.one', controls: ['nope'] },
      { label: 'step.two', controls: ['rating'] },
    ]);

    expect(strays.isStepValid()).toBe(true);
  });
});
