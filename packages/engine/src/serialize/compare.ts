/**
 * Ordem de textos igual em qualquer navegador (Princípio II): compara as unidades de código
 * UTF-16, sem regras de idioma. `localeCompare` sem locale fixo segue o idioma do navegador e muda
 * a ordem de ids válidos: em dinamarquês "aa" vai para depois do "z", em tcheco "ch" vai para
 * depois do "h" (os ids da China, `clube-chn-…`), e a mesma seed dava outro resultado.
 */
export function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
