import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProfessionalAccount } from '../account/list';
import { ProfessionalProfile } from '../profile/professional-profile';

@Component({
  selector: 'abf-professional-dashboard',
  imports: [RouterLink, ProfessionalAccount, ProfessionalProfile],
  templateUrl: './professional-dashboard.html',
  styleUrls: ['./professional-dashboard.scss'],
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ProfessionalDashboard {}
