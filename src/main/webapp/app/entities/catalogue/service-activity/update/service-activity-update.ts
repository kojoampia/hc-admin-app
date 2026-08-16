import { HttpResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable, finalize, map } from 'rxjs';

import { RELATIONSHIP_OPTIONS_PAGE_SIZE } from 'app/config/pagination.constants';
import { ICategory } from 'app/entities/catalogue/category/category.model';
import { CategoryService } from 'app/entities/catalogue/category/service/category.service';
import { AlertError } from 'app/shared/alert/alert-error';
import { TranslateDirective } from 'app/shared/language';
import { ServiceActivityService } from '../service/service-activity.service';
import { IServiceActivity } from '../service-activity.model';

import { ServiceActivityFormGroup, ServiceActivityFormService } from './service-activity-form.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'abf-service-activity-update',
  templateUrl: './service-activity-update.html',
  imports: [TranslateDirective, TranslatePipe, FontAwesomeModule, AlertError, ReactiveFormsModule],
})
export class ServiceActivityUpdate implements OnInit {
  readonly isSaving = signal(false);
  serviceActivity: IServiceActivity | null = null;

  categoriesSharedCollection = signal<ICategory[]>([]);

  protected serviceActivityService = inject(ServiceActivityService);
  protected serviceActivityFormService = inject(ServiceActivityFormService);
  protected categoryService = inject(CategoryService);
  protected activatedRoute = inject(ActivatedRoute);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  editForm: ServiceActivityFormGroup = this.serviceActivityFormService.createServiceActivityFormGroup();

  compareCategory = (o1: ICategory | null, o2: ICategory | null): boolean => this.categoryService.compareCategory(o1, o2);

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(({ serviceActivity }) => {
      this.serviceActivity = serviceActivity;
      if (serviceActivity) {
        this.updateForm(serviceActivity);
      }

      this.loadRelationshipsOptions();
    });
  }

  previousState(): void {
    globalThis.history.back();
  }

  save(): void {
    this.isSaving.set(true);
    const serviceActivity = this.serviceActivityFormService.getServiceActivity(this.editForm);
    if (serviceActivity.id === null) {
      this.subscribeToSaveResponse(this.serviceActivityService.create(serviceActivity));
    } else {
      this.subscribeToSaveResponse(this.serviceActivityService.update(serviceActivity));
    }
  }

  protected subscribeToSaveResponse(result: Observable<IServiceActivity | null>): void {
    result.pipe(finalize(() => this.onSaveFinalize())).subscribe({
      next: () => this.onSaveSuccess(),
      error: () => this.onSaveError(),
    });
  }

  protected onSaveSuccess(): void {
    this.previousState();
  }

  protected onSaveError(): void {
    // Api for inheritance.
  }

  protected onSaveFinalize(): void {
    this.isSaving.set(false);
  }

  protected updateForm(serviceActivity: IServiceActivity): void {
    this.serviceActivity = serviceActivity;
    this.serviceActivityFormService.resetForm(this.editForm, serviceActivity);

    this.categoriesSharedCollection.update(categories =>
      this.categoryService.addCategoryToCollectionIfMissing<ICategory>(categories, serviceActivity.category),
    );
  }

  protected loadRelationshipsOptions(): void {
    this.categoryService
      .query({ size: RELATIONSHIP_OPTIONS_PAGE_SIZE })
      .pipe(map((res: HttpResponse<ICategory[]>) => res.body ?? []))
      .pipe(
        map((categories: ICategory[]) =>
          this.categoryService.addCategoryToCollectionIfMissing<ICategory>(categories, this.serviceActivity?.category),
        ),
      )
      .subscribe((categories: ICategory[]) => this.categoriesSharedCollection.set(categories));
  }
}
