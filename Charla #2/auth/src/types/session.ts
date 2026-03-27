export type Brand<TValue, TBrand extends string> = TValue & {
  readonly __brand: TBrand;
};

export type AccessToken = Brand<string, "AccessToken">;
export type RefreshTokenValue = Brand<string, "RefreshTokenValue">;
export type RefreshTokenHash = Brand<string, "RefreshTokenHash">;

export type AccessTokenTtlSeconds = Brand<number, "AccessTokenTtlSeconds">;
export type RefreshTokenTtlDays = Brand<number, "RefreshTokenTtlDays">;

export type Iso8601UtcString = `${number}-${number}-${number}T${string}Z`;

export interface IssuedSession {
  accessToken: AccessToken;
  refreshToken: RefreshTokenValue;
  accessTokenExpiresAt: Iso8601UtcString;
  refreshTokenExpiresAt: Iso8601UtcString;
  refreshTokenHash: RefreshTokenHash;
}
