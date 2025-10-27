/**
 * Masks sensitive information in container numbers
 * @param containerNumber Full container number (e.g. ABCD1234567)
 * @returns Masked version showing first 4 and last 3 characters (e.g. ABCD***567)
 */
export function maskContainerNumber(containerNumber: string): string {
  if (!containerNumber || containerNumber.length < 7) return '*******';
  return `${containerNumber.slice(0, 4)}***${containerNumber.slice(-3)}`;
}

/**
 * Masks sensitive information in any text containing container numbers
 * @param text Input text containing container numbers
 * @returns Text with container numbers masked
 */
export function maskContainerNumbersInText(text: string): string {
  const containerRegex = /[A-Z]{4}\d{7}/g;
  return text.replace(containerRegex, match => maskContainerNumber(match));
}
