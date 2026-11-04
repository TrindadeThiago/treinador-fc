import type { Rng } from "../rng/xoshiro";

/**
 * `e^-x` só com multiplicações ((1 − x/2^16)^(2^16)): as funções transcendentais variam entre
 * motores de JavaScript e o resultado do jogo tem de ser o mesmo em qualquer um (Princípio II).
 */
export function expNegative(x: number): number {
  let value = 1 - x / 65536;
  for (let step = 0; step < 16; step++) value *= value;
  return value;
}

/** Poisson por inversão: um sorteio, sem laço longo para as médias do futebol. */
export function poisson(rng: Rng, mean: number): number {
  if (mean <= 0) return 0;
  const roll = rng.float();
  let probability = expNegative(mean);
  let cumulative = probability;
  let count = 0;
  while (roll > cumulative && count < 30) {
    count += 1;
    probability *= mean / count;
    cumulative += probability;
  }
  return count;
}
