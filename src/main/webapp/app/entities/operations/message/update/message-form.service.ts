import { Injectable } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import dayjs from 'dayjs/esm';

import { DATE_TIME_FORMAT } from 'app/config/input.constants';
import { IMessage, NewMessage } from '../message.model';

/**
 * A partial Type with required key is used as form input.
 */
type PartialWithRequiredKeyOf<T extends { id: unknown }> = Partial<Omit<T, 'id'>> & { id: T['id'] };

/**
 * Type for createFormGroup and resetForm argument.
 * It accepts IMessage for edit and NewMessageFormGroupInput for create.
 */
type MessageFormGroupInput = IMessage | PartialWithRequiredKeyOf<NewMessage>;

/**
 * Type that converts some properties for forms.
 */
type FormValueOf<T extends IMessage | NewMessage> = Omit<T, 'sentAt'> & {
  sentAt?: string | null;
};

type MessageFormRawValue = FormValueOf<IMessage>;

type NewMessageFormRawValue = FormValueOf<NewMessage>;

type MessageFormDefaults = Pick<NewMessage, 'id' | 'sentAt'>;

type MessageFormGroupContent = {
  id: FormControl<MessageFormRawValue['id'] | NewMessage['id']>;
  sentAt: FormControl<MessageFormRawValue['sentAt']>;
  fromAddress: FormControl<MessageFormRawValue['fromAddress']>;
  senderName: FormControl<MessageFormRawValue['senderName']>;
  subject: FormControl<MessageFormRawValue['subject']>;
  body: FormControl<MessageFormRawValue['body']>;
  channel: FormControl<MessageFormRawValue['channel']>;
  status: FormControl<MessageFormRawValue['status']>;
  priority: FormControl<MessageFormRawValue['priority']>;
};

export type MessageFormGroup = FormGroup<MessageFormGroupContent>;

@Injectable({ providedIn: 'root' })
export class MessageFormService {
  createMessageFormGroup(message?: MessageFormGroupInput): MessageFormGroup {
    const messageRawValue = this.convertMessageToMessageRawValue({
      ...this.getFormDefaults(),
      ...(message ?? { id: null }),
    });

    return new FormGroup<MessageFormGroupContent>({
      id: new FormControl(
        { value: messageRawValue.id, disabled: true },
        {
          nonNullable: true,
          validators: [Validators.required],
        },
      ),
      sentAt: new FormControl(messageRawValue.sentAt, {
        validators: [Validators.required],
      }),
      fromAddress: new FormControl(messageRawValue.fromAddress, {
        validators: [Validators.required, Validators.maxLength(120)],
      }),
      senderName: new FormControl(messageRawValue.senderName, {
        validators: [Validators.required, Validators.maxLength(80)],
      }),
      subject: new FormControl(messageRawValue.subject, {
        validators: [Validators.required, Validators.maxLength(160)],
      }),
      body: new FormControl(messageRawValue.body, {
        validators: [Validators.required],
      }),
      channel: new FormControl(messageRawValue.channel, {
        validators: [Validators.required],
      }),
      status: new FormControl(messageRawValue.status, {
        validators: [Validators.required],
      }),
      priority: new FormControl(messageRawValue.priority, {
        validators: [Validators.required],
      }),
    });
  }

  getMessage(form: MessageFormGroup): IMessage | NewMessage {
    return this.convertMessageRawValueToMessage(form.getRawValue());
  }

  resetForm(form: MessageFormGroup, message: MessageFormGroupInput): void {
    const messageRawValue = this.convertMessageToMessageRawValue({ ...this.getFormDefaults(), ...message });
    form.reset({
      ...messageRawValue,
      id: { value: messageRawValue.id, disabled: true },
    });
  }

  private getFormDefaults(): MessageFormDefaults {
    const currentTime = dayjs();

    return {
      id: null,
      sentAt: currentTime,
    };
  }

  private convertMessageRawValueToMessage(rawMessage: MessageFormRawValue | NewMessageFormRawValue): IMessage | NewMessage {
    return {
      ...rawMessage,
      sentAt: dayjs(rawMessage.sentAt, DATE_TIME_FORMAT),
    };
  }

  private convertMessageToMessageRawValue(
    message: IMessage | (Partial<NewMessage> & MessageFormDefaults),
  ): MessageFormRawValue | PartialWithRequiredKeyOf<NewMessageFormRawValue> {
    return {
      ...message,
      sentAt: message.sentAt ? message.sentAt.format(DATE_TIME_FORMAT) : undefined,
    };
  }
}
