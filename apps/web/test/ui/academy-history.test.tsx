// 038 US5: crias da base no histórico do clube e a faixa da promoção no detalhe do jogador.
import { academyHallOf } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { t } from "../../src/i18n";
import { ClubHistory } from "../../src/ui/history/WorldHistory";
import { promotionEstimateText } from "../../src/ui/PlayerDetails";
import { storedCareer } from "../helpers/career";

function withHall(save: SaveFile): SaveFile {
  const [star, other] = save.bank.players.filter((player) => player.clubId === save.clubId);
  if (!star || !other || !save.renewal.academy) throw new Error("sem elenco");
  return {
    ...save,
    renewal: {
      ...save.renewal,
      academy: {
        ...save.renewal.academy,
        graduates: {
          ...save.renewal.academy.graduates,
          [star.id]: {
            clubId: save.clubId,
            season: 1,
            peak: 81,
            estimate: { low: 70, high: 86 },
          },
        },
        hall: {
          [save.clubId]: {
            promoted: 3,
            best: [
              {
                playerId: star.id,
                name: star.displayName,
                position: star.position,
                peak: 81,
                season: 1,
              },
              {
                playerId: "jogador-aposentado",
                name: "Velho Ídolo",
                position: "GK",
                peak: 77,
                season: 1,
              },
            ],
          },
        },
      },
    },
  };
}

describe("crias no histórico do clube (038)", () => {
  it("total, maiores revelações com força máxima, e aposentado em texto", async () => {
    const { save } = await storedCareer(1, withHall);
    expect(academyHallOf(save.renewal, save.clubId).promoted).toBe(3);
    render(<ClubHistory save={save} />);
    const card = screen.getByRole("region", { name: t("history.clubs.academy") });
    expect(within(card).getByText(t("history.clubs.academy.promoted", { count: 3 }))).toBeDefined();
    const table = within(card).getByRole("table", { name: t("history.clubs.academy.best") });
    expect(within(table).getByText("81")).toBeDefined();
    expect(within(table).getByText("Velho Ídolo")).toBeDefined();
    expect(within(table).getByText(t("history.clubs.academy.retired"))).toBeDefined();
  });

  it("clube sem crias promovidas mostra o texto de vazio", async () => {
    const { save } = await storedCareer(1);
    const other = save.bank.clubs.find((club) => club.id !== save.clubId)?.id ?? "";
    render(<ClubHistory save={{ ...save, clubId: other, renewal: { ...save.renewal } }} />);
    const card = screen.getByRole("region", { name: t("history.clubs.academy") });
    expect(within(card).getByText(t("history.clubs.academy.none"))).toBeDefined();
  });

  it("a faixa da promoção aparece no detalhe só para quem a tem", async () => {
    const { save } = await storedCareer(1, withHall);
    const [star, other] = save.bank.players.filter((player) => player.clubId === save.clubId);
    expect(promotionEstimateText(save, star?.id ?? "", t)).toBe(
      t("academy.estimate.range", { low: 70, high: 86 }),
    );
    expect(promotionEstimateText(save, other?.id ?? "", t)).toBeUndefined();
  });
});
