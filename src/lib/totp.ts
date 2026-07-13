import { authenticator } from "otplib";
import QRCode from "qrcode";

authenticator.options = { window: 1 };

export function generateTotpSecret() {
  return authenticator.generateSecret();
}

export function verifyTotpCode(secret: string, code: string) {
  try {
    return authenticator.check(code.trim().replace(/\s+/g, ""), secret);
  } catch {
    return false;
  }
}

export async function totpQrCodeDataUrl(email: string, secret: string, issuer: string) {
  const otpauth = authenticator.keyuri(email, issuer, secret);
  return QRCode.toDataURL(otpauth);
}
