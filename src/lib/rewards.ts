/**
 * Recompensas intermedias de una tarjeta (planes Medium y Pro). El premio final
 * sigue siendo programs.reward_description al llegar a stamps_required.
 */
export interface Milestone {
  stampsAt: number;
  description: string;
}

export interface MilestoneStatus extends Milestone {
  claimed: boolean;
  /** Alcanzada y sin cobrar en el ciclo actual. */
  available: boolean;
}

export const MAX_MILESTONES = 5;

export function milestoneStatuses(milestones: Milestone[], count: number, claimed: number[]): MilestoneStatus[] {
  return [...milestones]
    .sort((a, b) => a.stampsAt - b.stampsAt)
    .map((m) => {
      const isClaimed = claimed.includes(m.stampsAt);
      return { ...m, claimed: isClaimed, available: !isClaimed && count >= m.stampsAt };
    });
}

/** Valida la lista que guarda el dueño. Devuelve el error o null. */
export function validateMilestones(milestones: Milestone[], stampsRequired: number): string | null {
  if (milestones.length > MAX_MILESTONES) return `Máximo ${MAX_MILESTONES} premios intermedios`;
  const seen = new Set<number>();
  for (const m of milestones) {
    if (!Number.isInteger(m.stampsAt) || m.stampsAt < 1 || m.stampsAt >= stampsRequired) {
      return `Los premios intermedios deben estar entre 1 y ${stampsRequired - 1} sellos`;
    }
    if (seen.has(m.stampsAt)) return `Hay dos premios en ${m.stampsAt} sellos`;
    if (!m.description.trim()) return "Escribe el premio de cada paso";
    seen.add(m.stampsAt);
  }
  return null;
}

/** Recompensa intermedia que se alcanzó al pasar de `before` a `after` sellos. */
export function reachedMilestone(milestones: Milestone[], before: number, after: number): Milestone | undefined {
  return [...milestones].sort((a, b) => b.stampsAt - a.stampsAt).find((m) => before < m.stampsAt && after >= m.stampsAt);
}

/** Próxima meta (intermedia o final) aún no alcanzada. */
export function nextGoal(
  milestones: Milestone[],
  count: number,
  stampsRequired: number,
  finalReward: string,
): Milestone {
  const next = [...milestones].sort((a, b) => a.stampsAt - b.stampsAt).find((m) => m.stampsAt > count);
  return next ?? { stampsAt: stampsRequired, description: finalReward };
}
