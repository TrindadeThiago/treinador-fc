import type { LeagueSeason } from "../career/types";
import type { CompletedBank } from "../model/types";
import { isRegionalOnly } from "../regional/scope";

/**
 * A liga com os clubes só regionais do país (023, A13 da auditoria) numa divisão a mais, para a
 * renovação dos jogadores (evolução, aposentadoria, jovens e elencos): eles não estão em nenhuma
 * divisão da liga principal e, sem isso, nunca evoluíam, não se aposentavam nem recebiam jovens.
 *
 * A divisão extra não tem registros nem calendário: os minutos desses clubes vêm dos estaduais (as
 * outras competições da evolução) e a rodada do meio da temporada continua a da liga. O regulador do
 * país continua medindo só a liga. Sem país ou sem clubes regionais, devolve a mesma liga.
 */
export function withRegionalClubs(world: CompletedBank, league: LeagueSeason): LeagueSeason {
  const countryId = world.competitions.find(
    (competition) => competition.id === league.competitionId,
  )?.countryId;
  if (countryId === undefined) return league;
  const inLeague = new Set(league.divisions.flatMap((season) => season.clubIds));
  const clubIds = world.clubs
    .filter(
      (club) =>
        club.countryId === countryId && !inLeague.has(club.id) && isRegionalOnly(world, club.id),
    )
    .map((club) => club.id)
    .sort();
  const last = league.divisions.at(-1);
  if (clubIds.length === 0 || !last) return league;
  const { stages: _stages, ...base } = last;
  const level = Math.max(...league.divisions.map((season) => season.divisionLevel)) + 1;
  return {
    ...league,
    divisions: [
      ...league.divisions,
      { ...base, divisionLevel: level, clubIds, records: [], calendar: [], status: {} },
    ],
  };
}
