import { Component, CUSTOM_ELEMENTS_SCHEMA, inject, Input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IProfessionalProfile, IProfessionalUser } from '../professional.model';
import { ProfessionalComponent } from '../list/professional';

@Component({
  selector: 'abf-professional-dashboard',
  imports: [RouterLink, ProfessionalComponent],
  templateUrl: './professional-dashboard.html',
  styleUrls: ['./professional-dashboard.scss'],
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ProfessionalDashboard {
  @Input() readonly accounts = signal<IProfessionalUser[]>([]);
  @Input() readonly profiles = signal<IProfessionalProfile[]>([]);
}
