import { Component, CUSTOM_ELEMENTS_SCHEMA, inject, Input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IProfessionalProfile, IProfessionalUser } from '../professional.model';
import { ProfessionalComponent } from '../list/professional';

@Component({
  selector: 'abf-professional-dashboard',
  imports: [RouterLink],
  templateUrl: './professional-dashboard.html',
  styleUrls: ['./professional-dashboard.scss'],
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ProfessionalDashboardComponent {
  @Input() readonly accounts!: IProfessionalUser[];
  @Input() readonly profiles!: IProfessionalProfile[];

  readonly accountList = signal<IProfessionalUser[]>([]);
  readonly profileList = signal<IProfessionalProfile[]>([]);

  protected readonly trackById = (index: number, item: IProfessionalProfile | IProfessionalUser) => item.id;
  protected readonly setAccounts = (accounts: IProfessionalUser[]) => this.accountList.set(accounts);
  protected readonly setProfiles = (profiles: IProfessionalProfile[]) => this.profileList.set(profiles);
}
