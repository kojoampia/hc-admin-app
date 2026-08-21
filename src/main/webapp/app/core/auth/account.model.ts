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
     * The gateway's user id. Present in every `GET /api/account` response.
     *
     * **It is not the join key into the admin service.** This comment used to say it was, and the
     * account screen believed it: `Profile.accountId` holds the **login**, so `/account` asked for
     * `by-account/a0eebc99-…-a11`, got the 404 that means "no profile yet", and offered to create
     * one for an administrator who already had one. Nothing errored — see
     * `account-settings.service.ts`, which is now the only file that decides this.
     *
     * What it is genuinely for is server-side and no business of the client's: the gateway mints it
     * as the `uid` claim so the api can stamp the right auditor on a document. Nothing in the
     * console reads this field today.
     *
     * Optional and last so existing callers, including the specs that build this as a literal, keep
     * working.
     */
    public id?: string | null,
  ) {}
}
