// Ruling 1301: a DIA statement never contains a number, in digits or in words. One rule, held here
// for the Edge Functions and in src/components/strand/DiaNote.tsx for the parts; the parity arm in
// tests/strand-admin.cjs fails the build when the two regular expressions differ, as
// tests/contact.cjs does for the contact module (387). Edit both together; never write a third copy.
// Import as `import { hasNumber } from "../_shared/has-number.ts"`.

export const NUMBER_WORDS =
  /\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|half|third|quarter|dozen|percent|per cent)\b/i;

/** True when a string contains a digit or a number word. */
export const hasNumber = (s: string): boolean => /\d/.test(s) || NUMBER_WORDS.test(s);
