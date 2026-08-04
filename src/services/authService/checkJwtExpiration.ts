import { jwtDecode } from "jwt-decode";

export default function checkJwtToken(
  jwt: string | undefined | null,
  minRemainingTime = 30000
): boolean {
  if (!jwt) return false;
  try {
    const decodedToken: Record<string, any> = jwtDecode(jwt);
    const expirationTime: number = decodedToken.exp * 1000;
    const nowDate = Date.now();

    if (nowDate + minRemainingTime > expirationTime) {
      return false;
    }
  } catch {
    return false;
  }

  return true;
}
