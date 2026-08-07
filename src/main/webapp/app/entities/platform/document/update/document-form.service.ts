import { Injectable } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import dayjs from 'dayjs/esm';

import { DATE_TIME_FORMAT } from 'app/config/input.constants';
import { IDocument, NewDocument } from '../document.model';

/**
 * A partial Type with required key is used as form input.
 */
type PartialWithRequiredKeyOf<T extends { id: unknown }> = Partial<Omit<T, 'id'>> & { id: T['id'] };

/**
 * Type for createFormGroup and resetForm argument.
 * It accepts IDocument for edit and NewDocumentFormGroupInput for create.
 */
type DocumentFormGroupInput = IDocument | PartialWithRequiredKeyOf<NewDocument>;

/**
 * Type that converts some properties for forms.
 */
type FormValueOf<T extends IDocument | NewDocument> = Omit<T, 'uploadedAt'> & {
  uploadedAt?: string | null;
};

type DocumentFormRawValue = FormValueOf<IDocument>;

type NewDocumentFormRawValue = FormValueOf<NewDocument>;

type DocumentFormDefaults = Pick<NewDocument, 'id' | 'uploadedAt'>;

type DocumentFormGroupContent = {
  id: FormControl<DocumentFormRawValue['id'] | NewDocument['id']>;
  name: FormControl<DocumentFormRawValue['name']>;
  description: FormControl<DocumentFormRawValue['description']>;
  url: FormControl<DocumentFormRawValue['url']>;
  uploadedAt: FormControl<DocumentFormRawValue['uploadedAt']>;
  patient: FormControl<DocumentFormRawValue['patient']>;
  vendor: FormControl<DocumentFormRawValue['vendor']>;
};

export type DocumentFormGroup = FormGroup<DocumentFormGroupContent>;

@Injectable({ providedIn: 'root' })
export class DocumentFormService {
  createDocumentFormGroup(document?: DocumentFormGroupInput): DocumentFormGroup {
    const documentRawValue = this.convertDocumentToDocumentRawValue({
      ...this.getFormDefaults(),
      ...(document ?? { id: null }),
    });

    return new FormGroup<DocumentFormGroupContent>({
      id: new FormControl(
        { value: documentRawValue.id, disabled: true },
        {
          nonNullable: true,
          validators: [Validators.required],
        },
      ),
      name: new FormControl(documentRawValue.name, {
        validators: [Validators.required, Validators.maxLength(120)],
      }),
      description: new FormControl(documentRawValue.description, {
        validators: [Validators.maxLength(300)],
      }),
      url: new FormControl(documentRawValue.url, {
        validators: [Validators.required, Validators.maxLength(400)],
      }),
      uploadedAt: new FormControl(documentRawValue.uploadedAt, {
        validators: [Validators.required],
      }),
      patient: new FormControl(documentRawValue.patient),
      vendor: new FormControl(documentRawValue.vendor),
    });
  }

  getDocument(form: DocumentFormGroup): IDocument | NewDocument {
    return this.convertDocumentRawValueToDocument(form.getRawValue());
  }

  resetForm(form: DocumentFormGroup, document: DocumentFormGroupInput): void {
    const documentRawValue = this.convertDocumentToDocumentRawValue({ ...this.getFormDefaults(), ...document });
    form.reset({
      ...documentRawValue,
      id: { value: documentRawValue.id, disabled: true },
    });
  }

  private getFormDefaults(): DocumentFormDefaults {
    const currentTime = dayjs();

    return {
      id: null,
      uploadedAt: currentTime,
    };
  }

  private convertDocumentRawValueToDocument(rawDocument: DocumentFormRawValue | NewDocumentFormRawValue): IDocument | NewDocument {
    return {
      ...rawDocument,
      uploadedAt: dayjs(rawDocument.uploadedAt, DATE_TIME_FORMAT),
    };
  }

  private convertDocumentToDocumentRawValue(
    document: IDocument | (Partial<NewDocument> & DocumentFormDefaults),
  ): DocumentFormRawValue | PartialWithRequiredKeyOf<NewDocumentFormRawValue> {
    return {
      ...document,
      uploadedAt: document.uploadedAt ? document.uploadedAt.format(DATE_TIME_FORMAT) : undefined,
    };
  }
}
