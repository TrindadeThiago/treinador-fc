/**
 * Cópia profunda com o mesmo resultado de `JSON.parse(JSON.stringify(value))` para os estados do
 * motor (objetos simples, listas, textos, números e booleanos), sem passar por texto. Mantém a
 * semântica do JSON: propriedades `undefined` ou função somem dos objetos e viram `null` nas listas,
 * números não finitos viram `null` e `-0` vira `0`. Datas e classes não aparecem nos estados.
 */
export function cloneData<T>(value: T): T {
  return copy(value) as T;
}

function copy(value: unknown): unknown {
  if (value === null) return null;
  switch (typeof value) {
    case "string":
    case "boolean":
      return value;
    case "number":
      return Number.isFinite(value) ? (value === 0 ? 0 : value) : null;
    case "object": {
      if (Array.isArray(value)) {
        const out = new Array(value.length);
        for (let index = 0; index < value.length; index++) {
          const item = value[index];
          out[index] = omitted(item) ? null : copy(item);
        }
        return out;
      }
      const out: Record<string, unknown> = {};
      for (const key of Object.keys(value)) {
        const item = (value as Record<string, unknown>)[key];
        if (!omitted(item)) out[key] = copy(item);
      }
      return out;
    }
    default:
      return undefined;
  }
}

/** O que o JSON não grava: `undefined`, funções e símbolos. */
function omitted(value: unknown): boolean {
  return value === undefined || typeof value === "function" || typeof value === "symbol";
}
