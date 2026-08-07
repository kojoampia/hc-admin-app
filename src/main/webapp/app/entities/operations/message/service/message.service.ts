import { HttpClient, HttpResponse, httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import dayjs from 'dayjs/esm';
import { Observable, map } from 'rxjs';

import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { createRequestOption } from 'app/core/request/request-util';
import { isPresent } from 'app/core/util/operators';
import { IMessage, NewMessage } from '../message.model';

export type PartialUpdateMessage = Partial<IMessage> & Pick<IMessage, 'id'>;

type RestOf<T extends IMessage | NewMessage> = Omit<T, 'sentAt'> & {
  sentAt?: string | null;
};

export type RestMessage = RestOf<IMessage>;

export type NewRestMessage = RestOf<NewMessage>;

export type PartialUpdateRestMessage = RestOf<PartialUpdateMessage>;

@Injectable()
export class MessagesService {
  readonly messagesParams = signal<Record<string, string | number | boolean | readonly (string | number | boolean)[]> | undefined>(
    undefined,
  );
  readonly messagesResource = httpResource<RestMessage[]>(() => {
    const params = this.messagesParams();
    if (!params) {
      return undefined;
    }
    return { url: this.resourceUrl, params };
  });
  /**
   * This signal holds the list of message that have been fetched. It is updated when the messagesResource emits a new value.
   * In case of error while fetching the messages, the signal is set to an empty array.
   */
  readonly messages = computed(() =>
    (this.messagesResource.hasValue() ? this.messagesResource.value() : []).map(item => this.convertValueFromServer(item)),
  );
  protected readonly applicationConfigService = inject(ApplicationConfigService);
  protected readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/messages');

  protected convertValueFromServer(restMessage: RestMessage): IMessage {
    return {
      ...restMessage,
      sentAt: restMessage.sentAt ? dayjs(restMessage.sentAt) : undefined,
    };
  }
}

@Injectable({ providedIn: 'root' })
export class MessageService extends MessagesService {
  protected readonly http = inject(HttpClient);

  create(message: NewMessage): Observable<IMessage> {
    const copy = this.convertValueFromClient(message);
    return this.http.post<RestMessage>(this.resourceUrl, copy).pipe(map(res => this.convertResponseFromServer(res)));
  }

  update(message: IMessage): Observable<IMessage> {
    const copy = this.convertValueFromClient(message);
    return this.http
      .put<RestMessage>(`${this.resourceUrl}/${encodeURIComponent(this.getMessageIdentifier(message))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  partialUpdate(message: PartialUpdateMessage): Observable<IMessage> {
    const copy = this.convertValueFromClient(message);
    return this.http
      .patch<RestMessage>(`${this.resourceUrl}/${encodeURIComponent(this.getMessageIdentifier(message))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  find(id: string): Observable<IMessage> {
    return this.http
      .get<RestMessage>(`${this.resourceUrl}/${encodeURIComponent(id)}`)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  query(req?: any): Observable<HttpResponse<IMessage[]>> {
    const options = createRequestOption(req);
    return this.http
      .get<RestMessage[]>(this.resourceUrl, { params: options, observe: 'response' })
      .pipe(map(res => res.clone({ body: this.convertResponseArrayFromServer(res.body!) })));
  }

  delete(id: string): Observable<undefined> {
    return this.http.delete<undefined>(`${this.resourceUrl}/${encodeURIComponent(id)}`);
  }

  getMessageIdentifier(message: Pick<IMessage, 'id'>): string {
    return message.id;
  }

  compareMessage(o1: Pick<IMessage, 'id'> | null, o2: Pick<IMessage, 'id'> | null): boolean {
    return o1 && o2 ? this.getMessageIdentifier(o1) === this.getMessageIdentifier(o2) : o1 === o2;
  }

  addMessageToCollectionIfMissing<Type extends Pick<IMessage, 'id'>>(
    messageCollection: Type[],
    ...messagesToCheck: (Type | null | undefined)[]
  ): Type[] {
    const messages: Type[] = messagesToCheck.filter(isPresent);
    if (messages.length > 0) {
      const messageCollectionIdentifiers = messageCollection.map(messageItem => this.getMessageIdentifier(messageItem));
      const messagesToAdd = messages.filter(messageItem => {
        const messageIdentifier = this.getMessageIdentifier(messageItem);
        if (messageCollectionIdentifiers.includes(messageIdentifier)) {
          return false;
        }
        messageCollectionIdentifiers.push(messageIdentifier);
        return true;
      });
      return [...messagesToAdd, ...messageCollection];
    }
    return messageCollection;
  }

  protected convertValueFromClient<T extends IMessage | NewMessage | PartialUpdateMessage>(message: T): RestOf<T> {
    return {
      ...message,
      sentAt: message.sentAt?.toJSON() ?? null,
    };
  }

  protected convertResponseFromServer(res: RestMessage): IMessage {
    return this.convertValueFromServer(res);
  }

  protected convertResponseArrayFromServer(res: RestMessage[]): IMessage[] {
    return res.map(item => this.convertValueFromServer(item));
  }
}
