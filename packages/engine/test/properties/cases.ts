import { createRng, type Rng } from "../../src/rng/xoshiro";

/**
 * Gerador de casos para os testes de propriedade (T2 da auditoria): sem dependência nova, cada caso
 * vem de um PRNG com seed própria, então uma falha é reproduzível pelo nome do caso que aparece na
 * mensagem (`propriedade#índice`).
 */
export function forCases(name: string, count: number, check: (rng: Rng, label: string) => void) {
  for (let index = 0; index < count; index++) {
    const label = `${name}#${index}`;
    check(createRng(label), label);
  }
}

/** Amostra sem repetição de `size` itens, na ordem sorteada. */
export function sample<T>(rng: Rng, items: readonly T[], size: number): T[] {
  return rng.shuffle(items).slice(0, Math.min(size, items.length));
}
