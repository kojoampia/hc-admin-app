import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ProfessionalAccount } from '../account/professional-account';
import { ProfessionalProfile } from '../profile/professional-profile';

@Component({
  selector: 'abf-professional-dashboard',
  imports: [ProfessionalAccount, ProfessionalProfile],
  templateUrl: './professional-dashboard.html',
  styleUrl: './professional-dashboard.scss',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ProfessionalDashboard {}
