import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const MAX_DIGITS = 11;

export function brazilPhoneDigits(value: unknown): string {
  return String(value ?? '').replace(/\D/g, '');
}

/** Máscara (XX) XXXXX-XXXX / (XX) XXXX-XXXX conforme o usuário digita (até 11 dígitos). */
export function maskBrazilPhoneInput(raw: string): string {
  const d = brazilPhoneDigits(raw).slice(0, MAX_DIGITS);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** DDD válido (11–99). */
function validDdd(ddd: number): boolean {
  return ddd >= 11 && ddd <= 99;
}

/** Celular: 11 dígitos, nono dígito (após DDD) é 9. Fixo: 10 dígitos. */
export function isValidBrazilPhoneDigits(digits: string): boolean {
  if (digits.length !== 10 && digits.length !== 11) return false;
  const ddd = parseInt(digits.slice(0, 2), 10);
  if (!validDdd(ddd)) return false;
  if (digits.length === 11) {
    return digits[2] === '9';
  }
  return true;
}

/** Opcional: vazio é válido; preenchido deve ser telefone BR completo. */
export function brazilPhoneOptionalValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const masked = control.value;
    if (masked == null || String(masked).trim() === '') return null;
    const digits = brazilPhoneDigits(masked);
    if (!isValidBrazilPhoneDigits(digits)) {
      return { brazilPhone: true };
    }
    return null;
  };
}

/** Só dígitos nacionais (10 ou 11) para enviar à API. */
export function normalizeBrazilPhoneForApi(masked: unknown): string | undefined {
  const digits = brazilPhoneDigits(masked);
  if (!digits) return undefined;
  return digits;
}
