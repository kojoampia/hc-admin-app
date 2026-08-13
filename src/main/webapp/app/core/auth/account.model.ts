export class Account {
  constructor(
    public activated: boolean,
    public authorities: string[],
    public email: string,
    public firstName: string | null,
    public langKey: string,
    public lastName: string | null,
    public login: string,
    public imageUrl: string | null,

    /**
     * The gateway's user id.
     *
     * Present in every `GET /api/account` response and simply never declared here. It is the join
     * key into the admin service — `Profile.accountId` holds it, and it is what the gateway mints
     * as the `uid` claim so the api can stamp the right auditor.
     *
     * Optional and last so existing callers, including the specs that build this as a literal, keep
     * working. A payload without it is not an error; it just means nothing can be joined.
     */
    public id?: string | null,
  ) {}
}
