// Users sign in with a 4-digit PIN. Rules shared by the browser and the server.
export const PIN_ERROR = "Нууц үг 4 оронтой тоо байна.";

export function isPin(value: string): boolean {
  return /^\d{4}$/.test(value);
}

/** Keeps only digits while typing a PIN. */
export function pinInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, 4);
}
