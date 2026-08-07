/**
 * The gateway's Account, as the console sees it.
 *
 * User records are owned by hc-admin-gateway, not by hc-admin-service: this
 * is the same record the JDL calls `Credential`, and `authorities` holds
 * gateway `Authority` values — always in ROLE_XXXX shape, because that is the
 * exact string that rides on the JWT's `auth` claim and is compared by
 * `hasAnyAuthority`. Translating between shapes at the boundary is how you
 * get an authority that silently never matches.
 *
 * Field names follow JHipster's stock user-management payload so the module
 * reads the way a JHipster developer expects, and so pointing it at a real
 * gateway needs no mapping layer.
 */
import dayjs from 'dayjs/esm';

export interface IUser {
  id: string | null;
  login?: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string;
  activated?: boolean;
  langKey?: string;
  authorities?: string[];
  createdBy?: string;
  createdDate?: dayjs.Dayjs | null;
  lastModifiedBy?: string;
  lastModifiedDate?: dayjs.Dayjs | null;
  password?: string;
}

export class User implements IUser {
  constructor(
    public id: string | null,
    public login?: string,
    public firstName?: string | null,
    public lastName?: string | null,
    public email?: string,
    public activated?: boolean,
    public langKey?: string,
    public authorities?: string[],
    public createdBy?: string,
    public createdDate?: dayjs.Dayjs | null,
    public lastModifiedBy?: string,
    public lastModifiedDate?: dayjs.Dayjs | null,
    public password?: string,
  ) {}
}

/** A user being created has no id yet; everything else is the same record. */
export type NewUser = Omit<IUser, 'id'> & { id: null };
