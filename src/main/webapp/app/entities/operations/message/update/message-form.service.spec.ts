import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';

import { sampleWithNewData, sampleWithRequiredData } from '../message.test-samples';

import { MessageFormService } from './message-form.service';

describe('Message Form Service', () => {
  let service: MessageFormService;

  beforeEach(() => {
    service = TestBed.inject(MessageFormService);
  });

  describe('Service methods', () => {
    describe('createMessageFormGroup', () => {
      it('should create a new form with FormControl', () => {
        const formGroup = service.createMessageFormGroup();

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            sentAt: expect.any(Object),
            fromAddress: expect.any(Object),
            senderName: expect.any(Object),
            subject: expect.any(Object),
            body: expect.any(Object),
            channel: expect.any(Object),
            status: expect.any(Object),
            priority: expect.any(Object),
          }),
        );
      });

      it('passing IMessage should create a new form with FormGroup', () => {
        const formGroup = service.createMessageFormGroup(sampleWithRequiredData);

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            sentAt: expect.any(Object),
            fromAddress: expect.any(Object),
            senderName: expect.any(Object),
            subject: expect.any(Object),
            body: expect.any(Object),
            channel: expect.any(Object),
            status: expect.any(Object),
            priority: expect.any(Object),
          }),
        );
      });
    });

    describe('getMessage', () => {
      it('should return NewMessage for default Message initial value', () => {
        const formGroup = service.createMessageFormGroup(sampleWithNewData);

        const message = service.getMessage(formGroup);

        expect(message).toMatchObject(sampleWithNewData);
      });

      it('should return NewMessage for empty Message initial value', () => {
        const formGroup = service.createMessageFormGroup();

        const message = service.getMessage(formGroup);

        expect(message).toMatchObject({});
      });

      it('should return IMessage', () => {
        const formGroup = service.createMessageFormGroup(sampleWithRequiredData);

        const message = service.getMessage(formGroup);

        expect(message).toMatchObject(sampleWithRequiredData);
      });
    });

    describe('resetForm', () => {
      it('passing IMessage should not enable id FormControl', () => {
        const formGroup = service.createMessageFormGroup();
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, sampleWithRequiredData);

        expect(formGroup.controls.id.disabled).toBe(true);
      });

      it('passing NewMessage should disable id FormControl', () => {
        const formGroup = service.createMessageFormGroup(sampleWithRequiredData);
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, { id: null });

        expect(formGroup.controls.id.disabled).toBe(true);
      });
    });
  });
});
