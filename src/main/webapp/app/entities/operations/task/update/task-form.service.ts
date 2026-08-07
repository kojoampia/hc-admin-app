import { Injectable } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import dayjs from 'dayjs/esm';

import { DATE_TIME_FORMAT } from 'app/config/input.constants';
import { ITask, NewTask } from '../task.model';

/**
 * A partial Type with required key is used as form input.
 */
type PartialWithRequiredKeyOf<T extends { id: unknown }> = Partial<Omit<T, 'id'>> & { id: T['id'] };

/**
 * Type for createFormGroup and resetForm argument.
 * It accepts ITask for edit and NewTaskFormGroupInput for create.
 */
type TaskFormGroupInput = ITask | PartialWithRequiredKeyOf<NewTask>;

/**
 * Type that converts some properties for forms.
 */
type FormValueOf<T extends ITask | NewTask> = Omit<T, 'createdAt'> & {
  createdAt?: string | null;
};

type TaskFormRawValue = FormValueOf<ITask>;

type NewTaskFormRawValue = FormValueOf<NewTask>;

type TaskFormDefaults = Pick<NewTask, 'id' | 'createdAt'>;

type TaskFormGroupContent = {
  id: FormControl<TaskFormRawValue['id'] | NewTask['id']>;
  title: FormControl<TaskFormRawValue['title']>;
  state: FormControl<TaskFormRawValue['state']>;
  priority: FormControl<TaskFormRawValue['priority']>;
  dueOn: FormControl<TaskFormRawValue['dueOn']>;
  tag: FormControl<TaskFormRawValue['tag']>;
  createdAt: FormControl<TaskFormRawValue['createdAt']>;
  owner: FormControl<TaskFormRawValue['owner']>;
  sourceMessage: FormControl<TaskFormRawValue['sourceMessage']>;
};

export type TaskFormGroup = FormGroup<TaskFormGroupContent>;

@Injectable({ providedIn: 'root' })
export class TaskFormService {
  createTaskFormGroup(task?: TaskFormGroupInput): TaskFormGroup {
    const taskRawValue = this.convertTaskToTaskRawValue({
      ...this.getFormDefaults(),
      ...(task ?? { id: null }),
    });

    return new FormGroup<TaskFormGroupContent>({
      id: new FormControl(
        { value: taskRawValue.id, disabled: true },
        {
          nonNullable: true,
          validators: [Validators.required],
        },
      ),
      title: new FormControl(taskRawValue.title, {
        validators: [Validators.required, Validators.maxLength(200)],
      }),
      state: new FormControl(taskRawValue.state, {
        validators: [Validators.required],
      }),
      priority: new FormControl(taskRawValue.priority, {
        validators: [Validators.required],
      }),
      dueOn: new FormControl(taskRawValue.dueOn),
      tag: new FormControl(taskRawValue.tag, {
        validators: [Validators.maxLength(40)],
      }),
      createdAt: new FormControl(taskRawValue.createdAt),
      owner: new FormControl(taskRawValue.owner),
      sourceMessage: new FormControl(taskRawValue.sourceMessage),
    });
  }

  getTask(form: TaskFormGroup): ITask | NewTask {
    return this.convertTaskRawValueToTask(form.getRawValue());
  }

  resetForm(form: TaskFormGroup, task: TaskFormGroupInput): void {
    const taskRawValue = this.convertTaskToTaskRawValue({ ...this.getFormDefaults(), ...task });
    form.reset({
      ...taskRawValue,
      id: { value: taskRawValue.id, disabled: true },
    });
  }

  private getFormDefaults(): TaskFormDefaults {
    const currentTime = dayjs();

    return {
      id: null,
      createdAt: currentTime,
    };
  }

  private convertTaskRawValueToTask(rawTask: TaskFormRawValue | NewTaskFormRawValue): ITask | NewTask {
    return {
      ...rawTask,
      createdAt: dayjs(rawTask.createdAt, DATE_TIME_FORMAT),
    };
  }

  private convertTaskToTaskRawValue(
    task: ITask | (Partial<NewTask> & TaskFormDefaults),
  ): TaskFormRawValue | PartialWithRequiredKeyOf<NewTaskFormRawValue> {
    return {
      ...task,
      createdAt: task.createdAt ? task.createdAt.format(DATE_TIME_FORMAT) : undefined,
    };
  }
}
