"use client";

import { divisionNameOf, type SaveFile, userDivisionLevel, userSeason } from "@brasfoot-like/save";
import { clubPosition } from "../../game/selectors";
import { useT } from "../../i18n";
import { WindowStatus } from "../market/WindowStatus";
import styles from "./home.module.css";

/**
 * Faixa do topo da Início (035 FR-005, FR-006). O clube, a divisão e a temporada já ficam no título
 * de cada tela (`ScreenHeader`); aqui entram a posição e o estado da janela, que antes ficava solto
 * entre os cartões. Para o técnico desempregado, a reputação no lugar da posição.
 */
export function HomeHeader({
  save,
  unemployed,
}: {
  save: SaveFile;
  unemployed?: boolean | undefined;
}) {
  const t = useT();
  return (
    <div className={styles.header}>
      <p className={styles.standing}>
        {unemployed
          ? t("career.reputation", { value: save.board.manager.reputation })
          : t("home.header.standing", {
              position: clubPosition(userSeason(save), save.bank, save.clubId),
              division: divisionNameOf(save, userDivisionLevel(save)),
            })}
      </p>
      <WindowStatus save={save} />
    </div>
  );
}
