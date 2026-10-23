import {
  ModalityRuleEngineConfig,
  ModalitySlug,
  SwimmingStrokeType,
} from '../types/domain';

/**
 * Configuração Parametrizável do Motor de Súmula por Modalidade — INTRAMED IX
 * Separada da camada visual para permitir ajustes conforme o regulamento oficial.
 */
export const SWIMMING_STROKES: SwimmingStrokeType[] = [
  'Crawl',
  'Borboleta',
  'Peito',
  'Costas',
];

export const MODALITY_RULE_ENGINE: Record<ModalitySlug, ModalityRuleEngineConfig> = {
  futsal: {
    modalityId: 'futsal',
    scoringModel: 'goals_timed',
    timerDirection: 'countdown',
    supportsCards: true,
    supportsTwoMinuteSuspension: false,
    supportsTeamFouls: true,
    supportsSubstitutions: true,
    supportsGoalkeeper: true,
    supportsPairs: false,
    defaultCategoryRules: {
      Masculino: {
        categoryName: 'Masculino',
        periodsCount: 2,
        periodDurationSeconds: 20 * 60, // 2 x 20 minutos
        hasOvertime: true,
        overtimeDurationSeconds: 5 * 60,
        timeoutDurationSeconds: 60,
        maxTimeoutsPerPeriod: 1,
        teamFoulLimitPerPeriod: 5,
      },
      Feminino: {
        categoryName: 'Feminino',
        periodsCount: 2,
        periodDurationSeconds: 15 * 60, // 2 x 15 minutos
        hasOvertime: true,
        overtimeDurationSeconds: 5 * 60,
        timeoutDurationSeconds: 60,
        maxTimeoutsPerPeriod: 1,
        teamFoulLimitPerPeriod: 5,
      },
    },
  },

  handebol: {
    modalityId: 'handebol',
    scoringModel: 'goals_timed',
    timerDirection: 'countdown',
    supportsCards: true,
    supportsTwoMinuteSuspension: true, // Exclusão de 2 minutos com contador individual
    supportsTeamFouls: false,
    supportsSubstitutions: true,
    supportsGoalkeeper: true,
    supportsPairs: false,
    defaultCategoryRules: {
      Masculino: {
        categoryName: 'Masculino',
        periodsCount: 2,
        periodDurationSeconds: 20 * 60, // 2 x 20 minutos
        hasOvertime: true,
        overtimeDurationSeconds: 5 * 60,
        timeoutDurationSeconds: 60,
        maxTimeoutsPerPeriod: 1,
      },
      Feminino: {
        categoryName: 'Feminino',
        periodsCount: 2,
        periodDurationSeconds: 15 * 60, // 2 x 15 minutos
        hasOvertime: true,
        overtimeDurationSeconds: 5 * 60,
        timeoutDurationSeconds: 60,
        maxTimeoutsPerPeriod: 1,
      },
    },
  },

  basquete: {
    modalityId: 'basquete',
    scoringModel: 'points_quarters',
    timerDirection: 'countdown',
    supportsCards: false,
    supportsTwoMinuteSuspension: false,
    supportsTeamFouls: true,
    supportsSubstitutions: true,
    supportsGoalkeeper: false,
    supportsPairs: false,
    defaultCategoryRules: {
      Masculino: {
        categoryName: 'Masculino',
        periodsCount: 4,
        periodDurationSeconds: 10 * 60, // 4 períodos de 10 minutos corridos
        hasOvertime: true,
        overtimeDurationSeconds: 5 * 60,
        timeoutDurationSeconds: 60,
        maxTimeoutsPerPeriod: 2,
        teamFoulLimitPerPeriod: 4,
      },
      Feminino: {
        categoryName: 'Feminino',
        periodsCount: 4,
        periodDurationSeconds: 10 * 60, // 4 períodos de 10 minutos corridos
        hasOvertime: true,
        overtimeDurationSeconds: 5 * 60,
        timeoutDurationSeconds: 60,
        maxTimeoutsPerPeriod: 2,
        teamFoulLimitPerPeriod: 4,
      },
    },
  },

  volei: {
    modalityId: 'volei',
    scoringModel: 'sets_points',
    timerDirection: 'none',
    supportsCards: true,
    supportsTwoMinuteSuspension: false,
    supportsTeamFouls: false,
    supportsSubstitutions: true,
    supportsGoalkeeper: false,
    supportsPairs: false,
    defaultCategoryRules: {
      Masculino: {
        categoryName: 'Masculino',
        periodsCount: 3, // Melhor de 3 sets
        periodDurationSeconds: 0,
        hasOvertime: false,
        overtimeDurationSeconds: 0,
        timeoutDurationSeconds: 30,
        maxTimeoutsPerPeriod: 2,
        setsToWin: 2,
        pointsPerSet: 25,
        decidingSetPoints: 15,
      },
      Feminino: {
        categoryName: 'Feminino',
        periodsCount: 3,
        periodDurationSeconds: 0,
        hasOvertime: false,
        overtimeDurationSeconds: 0,
        timeoutDurationSeconds: 30,
        maxTimeoutsPerPeriod: 2,
        setsToWin: 2,
        pointsPerSet: 25,
        decidingSetPoints: 15,
      },
    },
  },

  'volei-de-praia': {
    modalityId: 'volei-de-praia',
    scoringModel: 'sets_points',
    timerDirection: 'none',
    supportsCards: true,
    supportsTwoMinuteSuspension: false,
    supportsTeamFouls: false,
    supportsSubstitutions: false,
    supportsGoalkeeper: false,
    supportsPairs: true, // Disputado por duplas (2 atletas de cada lado)
    defaultCategoryRules: {
      Masculino: {
        categoryName: 'Masculino',
        periodsCount: 3,
        periodDurationSeconds: 0,
        hasOvertime: false,
        overtimeDurationSeconds: 0,
        timeoutDurationSeconds: 30,
        maxTimeoutsPerPeriod: 1,
        setsToWin: 2,
        pointsPerSet: 21,
        decidingSetPoints: 15,
      },
      Feminino: {
        categoryName: 'Feminino',
        periodsCount: 3,
        periodDurationSeconds: 0,
        hasOvertime: false,
        overtimeDurationSeconds: 0,
        timeoutDurationSeconds: 30,
        maxTimeoutsPerPeriod: 1,
        setsToWin: 2,
        pointsPerSet: 21,
        decidingSetPoints: 15,
      },
    },
  },

  'tenis-de-mesa': {
    modalityId: 'tenis-de-mesa',
    scoringModel: 'team_submatches',
    timerDirection: 'none',
    supportsCards: true,
    supportsTwoMinuteSuspension: false,
    supportsTeamFouls: false,
    supportsSubstitutions: false,
    supportsGoalkeeper: false,
    supportsPairs: false,
    defaultCategoryRules: {
      Geral: {
        categoryName: 'Equipes',
        periodsCount: 3,
        periodDurationSeconds: 0,
        hasOvertime: false,
        overtimeDurationSeconds: 0,
        timeoutDurationSeconds: 60,
        maxTimeoutsPerPeriod: 1,
        setsToWin: 2,
        pointsPerSet: 11,
        decidingSetPoints: 11,
      },
    },
  },

  natacao: {
    modalityId: 'natacao',
    scoringModel: 'swimming_heats',
    timerDirection: 'countup',
    supportsCards: false,
    supportsTwoMinuteSuspension: false,
    supportsTeamFouls: false,
    supportsSubstitutions: false,
    supportsGoalkeeper: false,
    supportsPairs: false,
    defaultCategoryRules: {
      Geral: {
        categoryName: 'Série Oficial',
        periodsCount: 1,
        periodDurationSeconds: 0,
        hasOvertime: false,
        overtimeDurationSeconds: 0,
        timeoutDurationSeconds: 0,
        maxTimeoutsPerPeriod: 0,
      },
    },
  },

  truco: {
    modalityId: 'truco',
    scoringModel: 'modular_table',
    timerDirection: 'none',
    supportsCards: false,
    supportsTwoMinuteSuspension: false,
    supportsTeamFouls: false,
    supportsSubstitutions: false,
    supportsGoalkeeper: false,
    supportsPairs: true,
    defaultCategoryRules: {
      Geral: {
        categoryName: 'Aguardando regulamento',
        periodsCount: 1,
        periodDurationSeconds: 0,
        hasOvertime: false,
        overtimeDurationSeconds: 0,
        timeoutDurationSeconds: 0,
        maxTimeoutsPerPeriod: 0,
      },
    },
  },

  sinuca: {
    modalityId: 'sinuca',
    scoringModel: 'modular_table',
    timerDirection: 'none',
    supportsCards: false,
    supportsTwoMinuteSuspension: false,
    supportsTeamFouls: false,
    supportsSubstitutions: false,
    supportsGoalkeeper: false,
    supportsPairs: false,
    defaultCategoryRules: {
      Geral: {
        categoryName: 'Aguardando regulamento',
        periodsCount: 1,
        periodDurationSeconds: 0,
        hasOvertime: false,
        overtimeDurationSeconds: 0,
        timeoutDurationSeconds: 0,
        maxTimeoutsPerPeriod: 0,
      },
    },
  },

  poker: {
    modalityId: 'poker',
    scoringModel: 'modular_table',
    timerDirection: 'none',
    supportsCards: false,
    supportsTwoMinuteSuspension: false,
    supportsTeamFouls: false,
    supportsSubstitutions: false,
    supportsGoalkeeper: false,
    supportsPairs: false,
    defaultCategoryRules: {
      Geral: {
        categoryName: 'Aguardando regulamento',
        periodsCount: 1,
        periodDurationSeconds: 0,
        hasOvertime: false,
        overtimeDurationSeconds: 0,
        timeoutDurationSeconds: 0,
        maxTimeoutsPerPeriod: 0,
      },
    },
  },
};

export function formatSecondsToClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatMsToSwimmingTime(ms: number): string {
  const safe = Math.max(0, Math.floor(ms));
  const totalSeconds = Math.floor(safe / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const hundredths = Math.floor((safe % 1000) / 10);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
}
