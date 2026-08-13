import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import dayjs from 'dayjs/esm';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslateDirective } from 'app/shared/language';

import { AccountService } from 'app/core/auth/account.service';
import { AccountSettingsService } from './account-settings.service';
import { IProfile } from 'app/entities/directory/profile/profile.model';
import { Title } from 'app/entities/enumerations/title.model';
import { Sex } from 'app/entities/enumerations/sex.model';
import { IdType } from 'app/entities/enumerations/id-type.model';

type Saved = 'account' | 'password' | 'profile';

/**
 * The signed-in administrator's own account.
 *
 * <p>Reached from the card at the foot of the sidenav, which used to point at
 * `/organisation-profile` — the company's record, not the person's. There was nowhere else for it to
 * go: the console had no account screen at all, though the translations had carried
 * `account.settings` and `account.password` labels for one since the beginning.
 *
 * <p>Three sections, because the person is stored in two systems:
 *
 * <ul>
 *   <li><b>Details</b> and <b>Password</b> are the gateway's account. It owns credentials, and it is
 *       the only thing that can change one.</li>
 *   <li><b>Profile</b> is the admin service's record of the person — title, date of birth, sex, ID,
 *       contact. Joined by `Profile.accountId`.</li>
 * </ul>
 *
 * <p>The profile section creates as readily as it edits, and creation is the common path rather than
 * the exception: production holds no profiles at all, so every administrator arrives here with
 * nothing to edit. That is why the form is a full one — a Profile has seven required fields and
 * there is no such thing as a stub.
 */
@Component({
  selector: 'abf-account',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './account.html',
  styleUrl: './account.scss',
  imports: [ReactiveFormsModule, FontAwesomeModule, TranslateDirective],
})
export default class AccountPage implements OnInit {
  readonly titles = Object.keys(Title);
  readonly sexes = Object.keys(Sex);
  readonly idTypes = Object.keys(IdType);

  readonly account = inject(AccountService).account;

  readonly profile = signal<IProfile | null>(null);
  readonly saved = signal<Saved | null>(null);
  readonly failed = signal<Saved | null>(null);
  readonly saving = signal(false);

  /** Whether the profile section is creating rather than editing — it drives the heading and button. */
  readonly creatingProfile = computed(() => this.profile() === null);

  readonly detailsForm = new FormGroup({
    firstName: new FormControl<string | null>(null, { validators: [Validators.maxLength(50)] }),
    lastName: new FormControl<string | null>(null, { validators: [Validators.maxLength(50)] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email, Validators.maxLength(254)] }),
    langKey: new FormControl('en', { nonNullable: true, validators: [Validators.required] }),
  });

  readonly passwordForm = new FormGroup({
    currentPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    newPassword: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
    confirmPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  /** Mirrors the api's constraints. Seven of these are required there, so they are required here. */
  readonly profileForm = new FormGroup({
    title: new FormControl<string | null>(null),
    firstName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(50)] }),
    middleName: new FormControl<string | null>(null, { validators: [Validators.maxLength(50)] }),
    lastName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(50)] }),
    dateOfBirth: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    sex: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    mobilePhone: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(24)] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email, Validators.maxLength(120)] }),
    idType: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    idNumber: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  private readonly accountService = inject(AccountService);
  private readonly settingsService = inject(AccountSettingsService);

  ngOnInit(): void {
    const account = this.account();
    if (!account) {
      return;
    }

    this.detailsForm.patchValue({
      firstName: account.firstName,
      lastName: account.lastName,
      email: account.email,
      langKey: account.langKey,
    });

    // Seed the profile form from the account, so creating one does not mean retyping what the
    // gateway already knows. Overwritten below if a profile already exists.
    this.profileForm.patchValue({
      firstName: account.firstName ?? '',
      lastName: account.lastName ?? '',
      email: account.email,
    });

    if (account.id) {
      this.settingsService.findProfile(account.id).subscribe(profile => {
        this.profile.set(profile);
        if (profile) {
          this.profileForm.patchValue({
            title: profile.title ?? null,
            firstName: profile.firstName ?? '',
            middleName: profile.middleName ?? null,
            lastName: profile.lastName ?? '',
            dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.format('YYYY-MM-DD') : '',
            sex: profile.sex ?? '',
            mobilePhone: profile.mobilePhone ?? '',
            email: profile.email ?? '',
            idType: profile.idType ?? '',
            idNumber: profile.idNumber ?? '',
          });
        }
      });
    }
  }

  saveDetails(): void {
    const account = this.account();
    if (this.detailsForm.invalid || !account) {
      return;
    }
    this.begin();
    const form = this.detailsForm.getRawValue();
    this.settingsService
      .save({
        ...AccountSettingsService.settingsFrom(account),
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        langKey: form.langKey,
      })
      .subscribe({
        // Refetch rather than assume: the gateway is the source of truth for the account, and the
        // sidenav reads the same signal, so a stale name would show in two places at once.
        next: () => this.accountService.identity(true).subscribe(() => this.done('account')),
        error: () => this.fail('account'),
      });
  }

  changePassword(): void {
    const form = this.passwordForm.getRawValue();
    if (this.passwordForm.invalid || form.newPassword !== form.confirmPassword) {
      this.fail('password');
      return;
    }
    this.begin();
    this.settingsService.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword }).subscribe({
      next: () => {
        this.passwordForm.reset();
        this.done('password');
      },
      error: () => this.fail('password'),
    });
  }

  saveProfile(): void {
    const account = this.account();
    if (this.profileForm.invalid || !account?.id) {
      return;
    }
    this.begin();
    const form = this.profileForm.getRawValue();
    const body = {
      accountId: account.id,
      title: form.title as IProfile['title'],
      firstName: form.firstName,
      middleName: form.middleName,
      lastName: form.lastName,
      dateOfBirth: dayjs(form.dateOfBirth),
      sex: form.sex as IProfile['sex'],
      mobilePhone: form.mobilePhone,
      email: form.email,
      idType: form.idType as IProfile['idType'],
      idNumber: form.idNumber,
    };

    const existing = this.profile();
    const request = existing
      ? this.settingsService.updateProfile({ ...existing, ...body })
      : this.settingsService.createProfile({ ...body, id: null });

    request.subscribe({
      next: profile => {
        this.profile.set(profile);
        this.done('profile');
      },
      error: () => this.fail('profile'),
    });
  }

  private begin(): void {
    this.saving.set(true);
    this.saved.set(null);
    this.failed.set(null);
  }

  private done(section: Saved): void {
    this.saving.set(false);
    this.saved.set(section);
  }

  private fail(section: Saved): void {
    this.saving.set(false);
    this.failed.set(section);
  }
}
