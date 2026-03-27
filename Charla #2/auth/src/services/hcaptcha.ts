import { BadRequestError } from "@eftickets/common";

interface HCaptchaVerificationResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  ["error-codes"]?: string[];
}

const HCAPTCHA_VERIFY_URL = "https://api.hcaptcha.com/siteverify";
const HCAPTCHA_LOCAL_TEST_SITE_KEY =
  "10000000-ffff-ffff-ffff-000000000001";
const HCAPTCHA_LOCAL_TEST_SECRET =
  "0x0000000000000000000000000000000000000000";

export const canUseLocalHCaptchaTestKey = () => {
  if (process.env.NODE_ENV === "test" || process.env.NODE_ENV === "production") {
    return false;
  }

  return process.env.HCAPTCHA_USE_TEST_KEY !== "false";
};

export const resolveHCaptchaSecret = () => {
  if (canUseLocalHCaptchaTestKey()) {
    return HCAPTCHA_LOCAL_TEST_SECRET;
  }

  return process.env.HCAPTCHA_SECRET_KEY;
};

export const resolveHCaptchaSiteKey = () => {
  if (canUseLocalHCaptchaTestKey()) {
    return HCAPTCHA_LOCAL_TEST_SITE_KEY;
  }

  return process.env.HCAPTCHA_SITE_KEY;
};

const shouldValidateCaptcha = () => {
  if (process.env.NODE_ENV === "test") {
    return false;
  }

  if (process.env.HCAPTCHA_REQUIRED === "true") {
    return true;
  }

  return Boolean(resolveHCaptchaSecret());
};

export const verifyHCaptcha = async (
  captchaToken: string | undefined,
  remoteIp?: string
) => {
  if (!shouldValidateCaptcha()) {
    return;
  }

  const secret = resolveHCaptchaSecret();
  const siteKey = resolveHCaptchaSiteKey();
  if (!secret) {
    throw new BadRequestError(
      "Captcha no configurado en el servidor. Contacta al administrador."
    );
  }

  if (!captchaToken) {
    throw new BadRequestError("Completa el captcha para continuar.");
  }

  const fetchFn = (globalThis as any).fetch;
  if (typeof fetchFn !== "function") {
    throw new BadRequestError("No se puede validar captcha en este entorno.");
  }

  const formBody =
    `secret=${encodeURIComponent(secret)}` +
    `&response=${encodeURIComponent(captchaToken)}` +
    `${siteKey ? `&sitekey=${encodeURIComponent(siteKey)}` : ""}` +
    `${remoteIp ? `&remoteip=${encodeURIComponent(remoteIp)}` : ""}`;

  const response = await fetchFn(HCAPTCHA_VERIFY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formBody,
  });

  if (!response.ok) {
    throw new BadRequestError("No se pudo verificar el captcha.");
  }

  const data = (await response.json()) as HCaptchaVerificationResponse;
  if (!data.success) {
    throw new BadRequestError("Captcha inválido. Inténtalo nuevamente.");
  }
};
