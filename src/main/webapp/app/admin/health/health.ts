import { KeyValuePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap/modal';

import { TranslateDirective } from 'app/shared/language';
import { humaniseTranslationKey } from 'app/config/translation.config';

import { HealthDetails, HealthModel, HealthStatus } from './health.model';
import { HealthService } from './health.service';
import HealthModal from './modal/health-modal';

@Component({
  selector: 'abf-health',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './health.html',
  imports: [TranslateDirective, FontAwesomeModule, KeyValuePipe],
})
export default class Health implements OnInit {
  readonly health = signal<HealthModel | null>(null);

  private readonly modalService = inject(NgbModal);
  private readonly healthService = inject(HealthService);

  ngOnInit(): void {
    this.refresh();
  }

  /**
   * What the cell shows before translations resolve, and for any component nobody has labelled.
   *
   * The template carried a six-entry object literal for this — a third copy of the label map, and
   * the one that drifted furthest: it never gained `mongo`, `consul` or the discovery components.
   * Deriving it means there is one place labels are written (the i18n file) and one rule for
   * everything else.
   */
  indicatorLabel(key: string): string {
    return humaniseTranslationKey(key);
  }

  getBadgeClass(statusState: HealthStatus): string {
    if (statusState === 'UP') {
      return 'bg-success';
    }
    return 'bg-danger';
  }

  refresh(): void {
    this.healthService.checkHealth().subscribe({
      next: health => this.health.set(health),
      error: (error: HttpErrorResponse) => {
        if (error.status === 503) {
          this.health.set(error.error);
        }
      },
    });
  }

  showHealth(health: { key: string; value: HealthDetails }): void {
    const modalRef = this.modalService.open(HealthModal);
    modalRef.componentInstance.health = health;
  }
}
