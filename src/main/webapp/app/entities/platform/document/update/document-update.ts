import { HttpResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable, finalize, map } from 'rxjs';

import { RELATIONSHIP_OPTIONS_PAGE_SIZE } from 'app/config/pagination.constants';
import { IPatient } from 'app/entities/directory/patient/patient.model';
import { PatientService } from 'app/entities/directory/patient/service/patient.service';
import { VendorService } from 'app/entities/directory/vendor/service/vendor.service';
import { IVendor } from 'app/entities/directory/vendor/vendor.model';
import { AlertError } from 'app/shared/alert/alert-error';
import { TranslateDirective } from 'app/shared/language';
import { IDocument } from '../document.model';
import { DocumentService } from '../service/document.service';

import { DocumentFormGroup, DocumentFormService } from './document-form.service';
import RecordLabelPipe from 'app/shared/format/record-label.pipe';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'abf-document-update',
  templateUrl: './document-update.html',
  imports: [RecordLabelPipe, TranslateDirective, TranslatePipe, FontAwesomeModule, AlertError, ReactiveFormsModule],
})
export class DocumentUpdate implements OnInit {
  readonly isSaving = signal(false);
  document: IDocument | null = null;

  patientsSharedCollection = signal<IPatient[]>([]);
  vendorsSharedCollection = signal<IVendor[]>([]);

  protected documentService = inject(DocumentService);
  protected documentFormService = inject(DocumentFormService);
  protected patientService = inject(PatientService);
  protected vendorService = inject(VendorService);
  protected activatedRoute = inject(ActivatedRoute);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  editForm: DocumentFormGroup = this.documentFormService.createDocumentFormGroup();

  comparePatient = (o1: IPatient | null, o2: IPatient | null): boolean => this.patientService.comparePatient(o1, o2);

  compareVendor = (o1: IVendor | null, o2: IVendor | null): boolean => this.vendorService.compareVendor(o1, o2);

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(({ document }) => {
      this.document = document;
      if (document) {
        this.updateForm(document);
      }

      this.loadRelationshipsOptions();
    });
  }

  previousState(): void {
    globalThis.history.back();
  }

  save(): void {
    this.isSaving.set(true);
    const document = this.documentFormService.getDocument(this.editForm);
    if (document.id === null) {
      this.subscribeToSaveResponse(this.documentService.create(document));
    } else {
      this.subscribeToSaveResponse(this.documentService.update(document));
    }
  }

  protected subscribeToSaveResponse(result: Observable<IDocument | null>): void {
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

  protected updateForm(document: IDocument): void {
    this.document = document;
    this.documentFormService.resetForm(this.editForm, document);

    this.patientsSharedCollection.update(patients =>
      this.patientService.addPatientToCollectionIfMissing<IPatient>(patients, document.patient),
    );
    this.vendorsSharedCollection.update(vendors => this.vendorService.addVendorToCollectionIfMissing<IVendor>(vendors, document.vendor));
  }

  protected loadRelationshipsOptions(): void {
    this.patientService
      .query({ size: RELATIONSHIP_OPTIONS_PAGE_SIZE })
      .pipe(map((res: HttpResponse<IPatient[]>) => res.body ?? []))
      .pipe(map((patients: IPatient[]) => this.patientService.addPatientToCollectionIfMissing<IPatient>(patients, this.document?.patient)))
      .subscribe((patients: IPatient[]) => this.patientsSharedCollection.set(patients));

    this.vendorService
      .query({ size: RELATIONSHIP_OPTIONS_PAGE_SIZE })
      .pipe(map((res: HttpResponse<IVendor[]>) => res.body ?? []))
      .pipe(map((vendors: IVendor[]) => this.vendorService.addVendorToCollectionIfMissing<IVendor>(vendors, this.document?.vendor)))
      .subscribe((vendors: IVendor[]) => this.vendorsSharedCollection.set(vendors));
  }
}
