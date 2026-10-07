import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { database, transaction } from "./database";
import { account, issueSession, requireRecentAuthentication } from "./session";
import { ApiError, digest, origin, token } from "./security";
const rpID = () => new URL(origin()).hostname;
const cookieName = "capital_challenge";
export async function options(kind: "register" | "login", name: string) {
  const user = kind === "register" ? await account() : null;
  if (user) await requireRecentAuthentication();
  const id = user?.id ?? randomUUID();
  if (kind === "register" && !user && !name.trim())
    throw new ApiError(400, "Вкажіть ваше ім’я");
  const credentials = user
    ? (
        await (
          await database()
        ).query(
          "SELECT id,transports FROM capital_private.credentials WHERE user_id=$1",
          [id],
        )
      ).rows
    : [];
  const value =
    kind === "register"
      ? await generateRegistrationOptions({
          rpName: "єКапітал",
          rpID: rpID(),
          userName: user?.name ?? name,
          userID: new Uint8Array(Buffer.from(id)),
          attestationType: "none",
          excludeCredentials: credentials,
          authenticatorSelection: {
            residentKey: "required",
            userVerification: "required",
          },
        })
      : await generateAuthenticationOptions({
          rpID: rpID(),
          userVerification: "required",
        });
  const nonce = token();
  await (
    await database()
  ).query(
    `INSERT INTO capital_private.challenges(hash,kind,challenge,user_id,name,existing,expires_at)
 VALUES($1,$2,$3,$4,$5,$6,now()+interval '5 minutes')`,
    [
      digest(nonce),
      kind,
      value.challenge,
      id,
      user?.name ?? name,
      Boolean(user),
    ],
  );
  (await cookies()).set(cookieName, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 300,
  });
  return value;
}
export async function verify(
  kind: "register" | "login",
  response: RegistrationResponseJSON | AuthenticationResponseJSON,
) {
  const c = await cookies(),
    nonce = c.get(cookieName)?.value;
  c.delete(cookieName);
  if (!nonce) throw new ApiError(400, "Вхід закінчився. Спробуйте ще раз.");
  const db = await database();
  const result = await db.query(
    "DELETE FROM capital_private.challenges WHERE hash=$1 AND kind=$2 AND expires_at>now() RETURNING *",
    [digest(nonce), kind],
  );
  const challenge = result.rows[0];
  if (!challenge)
    throw new ApiError(400, "Ключ запиту вже використано або він застарів");
  let userId: string;
  if (kind === "register") {
    if (challenge.existing && (await account())?.id !== challenge.user_id)
      throw new ApiError(401, "Увійдіть повторно");
    if (challenge.existing) await requireRecentAuthentication();
    const verified = await verifyRegistrationResponse({
      response: response as RegistrationResponseJSON,
      expectedChallenge: challenge.challenge,
      expectedOrigin: origin(),
      expectedRPID: rpID(),
      requireUserVerification: true,
    });
    if (!verified.verified || !verified.registrationInfo)
      throw new ApiError(400, "Ключ не підтверджено");
    const credential = verified.registrationInfo.credential;
    await transaction(async (tx) => {
      if (!challenge.existing)
        await tx.query(
          "INSERT INTO capital_private.users(id,name) VALUES($1,$2)",
          [challenge.user_id, challenge.name],
        );
      await tx.query(
        "INSERT INTO capital_private.credentials(id,user_id,public_key,counter,transports) VALUES($1,$2,$3,$4,$5)",
        [
          credential.id,
          challenge.user_id,
          Buffer.from(credential.publicKey),
          credential.counter,
          JSON.stringify(credential.transports ?? []),
        ],
      );
    });
    userId = challenge.user_id;
  } else {
    userId = await transaction(async (tx) => {
      const r = await tx.query(
        "SELECT * FROM capital_private.credentials WHERE id=$1 FOR UPDATE",
        [response.id],
      );
      const credential = r.rows[0];
      if (!credential) throw new ApiError(400, "Ключ не підтверджено");
      const assertion = response as AuthenticationResponseJSON;
      if (
        assertion.response.userHandle &&
        assertion.response.userHandle !==
          Buffer.from(credential.user_id).toString("base64url")
      )
        throw new ApiError(400, "Ключ іншого профілю");
      const v = await verifyAuthenticationResponse({
        response: assertion,
        expectedChallenge: challenge.challenge,
        expectedOrigin: origin(),
        expectedRPID: rpID(),
        requireUserVerification: true,
        credential: {
          id: credential.id,
          publicKey: new Uint8Array(credential.public_key),
          counter: Number(credential.counter),
          transports: credential.transports,
        },
      });
      if (!v.verified) throw new ApiError(400, "Ключ не підтверджено");
      await tx.query(
        "UPDATE capital_private.credentials SET counter=$1 WHERE id=$2",
        [v.authenticationInfo.newCounter, credential.id],
      );
      return credential.user_id as string;
    });
  }
  await db.query(
    "UPDATE capital_private.users SET last_seen=now() WHERE id=$1",
    [userId],
  );
  await issueSession(userId);
  return account();
}
