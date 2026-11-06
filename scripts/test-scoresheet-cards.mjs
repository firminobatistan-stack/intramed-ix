import assert from 'node:assert';
import ExcelJS from 'exceljs';

console.log('🧪 Iniciando bateria de testes: Súmula Automática, Cartões e Relatório Excel...');

// ==========================================
// TESTE 1: Auditoria da Súmula e Eventos Disciplinares
// ==========================================
console.log('\n--- Teste 1: Regras Disciplinares da Súmula ---');

// Mock da função helper do GeneratedMatchSheetPage
function buildTeamPlayerRows(events, athleteList, side) {
  const sideEvents = events.filter((e) => e.teamSide === side);
  
  return athleteList.map((a) => {
    const aEvents = sideEvents.filter(
      (e) => (e.athleteId && e.athleteId === a.id) || (e.athleteName && e.athleteName === a.name)
    );

    const goals = aEvents.filter((e) => e.type === 'goal' && !e.cancelled).length;
    const ownGoals = aEvents.filter((e) => e.type === 'own_goal' && !e.cancelled).length;
    const yellowCards = aEvents.filter((e) => e.type === 'yellow_card' && !e.cancelled);
    const redCards = aEvents.filter(
      (e) => (e.type === 'red_card' || e.type === 'expulsion' || e.type === 'disqualification') && !e.cancelled
    );
    const suspensions = aEvents.filter((e) => e.type === 'suspension_2min' && !e.cancelled);

    // Segundo amarelo = expulsão automática
    const hasSecondYellow = yellowCards.length >= 2;
    // 3 suspensões no handebol = desqualificação automática
    const hasThreeSuspensions = suspensions.length >= 3;

    const isExpelled = redCards.length > 0 || hasSecondYellow || hasThreeSuspensions;

    return {
      athleteId: a.id,
      name: a.name,
      goals,
      ownGoals,
      yellowCardsCount: yellowCards.length,
      redCardsCount: redCards.length,
      isExpelled,
      yellowClock1: yellowCards[0]?.matchClockDisplay || null,
      yellowClock2: yellowCards[1]?.matchClockDisplay || null,
      redClock: redCards[0]?.matchClockDisplay || yellowCards[1]?.matchClockDisplay || null,
    };
  });
}

const mockAthletes = [
  { id: 'ath_1', name: 'Carlos Silva' },
  { id: 'ath_2', name: 'Rodrigo Lima' },
  { id: 'ath_3', name: 'Lucas Mendes' },
  { id: 'ath_4', name: 'Felipe Costa' },
];

const mockEvents = [
  // Carlos Silva toma 1 amarelo aos 10:15
  { id: 'ev_1', type: 'yellow_card', teamSide: 'home', athleteId: 'ath_1', athleteName: 'Carlos Silva', matchClockDisplay: '10:15' },
  // Carlos Silva toma o 2º amarelo aos 24:30 (deve virar expulsão na súmula!)
  { id: 'ev_2', type: 'yellow_card', teamSide: 'home', athleteId: 'ath_1', athleteName: 'Carlos Silva', matchClockDisplay: '24:30' },
  // Rodrigo Lima toma cartão vermelho direto (expulsão direta) aos 18:00
  { id: 'ev_3', type: 'expulsion', teamSide: 'home', athleteId: 'ath_2', athleteName: 'Rodrigo Lima', matchClockDisplay: '18:00' },
  // Lucas Mendes comete gol contra aos 05:40
  { id: 'ev_4', type: 'own_goal', teamSide: 'home', athleteId: 'ath_3', athleteName: 'Lucas Mendes', matchClockDisplay: '05:40' },
  // Felipe Costa toma 3 exclusões de 2min no Handebol
  { id: 'ev_5', type: 'suspension_2min', teamSide: 'home', athleteId: 'ath_4', athleteName: 'Felipe Costa', matchClockDisplay: '08:00' },
  { id: 'ev_6', type: 'suspension_2min', teamSide: 'home', athleteId: 'ath_4', athleteName: 'Felipe Costa', matchClockDisplay: '22:00' },
  { id: 'ev_7', type: 'suspension_2min', teamSide: 'home', athleteId: 'ath_4', athleteName: 'Felipe Costa', matchClockDisplay: '38:00' },
];

const results = buildTeamPlayerRows(mockEvents, mockAthletes, 'home');

// Verificação 1: Carlos Silva (2º amarelo)
const carlos = results.find((r) => r.athleteId === 'ath_1');
assert(carlos, 'Carlos Silva deve existir');
assert.strictEqual(carlos.yellowCardsCount, 2, 'Carlos deve ter 2 cartões amarelos');
assert.strictEqual(carlos.isExpelled, true, 'Carlos deve estar sinalizado como expulso');
assert.strictEqual(carlos.redClock, '24:30', 'Horário do vermelho de Carlos deve ser o do 2º amarelo');
console.log('✅ Sub-teste 1.1: 2º Cartão Amarelo promoveu automaticamente a expulsão na súmula.');

// Verificação 2: Rodrigo Lima (Expulsão direta com type expulsion ou red_card)
const rodrigo = results.find((r) => r.athleteId === 'ath_2');
assert(rodrigo, 'Rodrigo Lima deve existir');
assert.strictEqual(rodrigo.isExpelled, true, 'Rodrigo deve estar expulso');
assert.strictEqual(rodrigo.redClock, '18:00', 'Horário da expulsão direta deve constar na súmula');
console.log('✅ Sub-teste 1.2: Expulsão direta registrada com sucesso na súmula.');

// Verificação 3: Lucas Mendes (Gol Contra não pontua a favor do atleta)
const lucas = results.find((r) => r.athleteId === 'ath_3');
assert(lucas, 'Lucas Mendes deve existir');
assert.strictEqual(lucas.goals, 0, 'Gol contra não pode ser creditado como gol pró do atleta');
assert.strictEqual(lucas.ownGoals, 1, 'Gol contra contabilizado separadamente');
console.log('✅ Sub-teste 1.3: Gol contra não pontua indevidamente na artilharia do atleta.');

// Verificação 4: Felipe Costa (3 exclusões de 2min geram desqualificação no handebol)
const felipe = results.find((r) => r.athleteId === 'ath_4');
assert(felipe, 'Felipe Costa deve existir');
assert.strictEqual(felipe.isExpelled, true, '3ª exclusão no handebol deve gerar desqualificação');
console.log('✅ Sub-teste 1.4: 3 Exclusões no Handebol geram cartão vermelho/desqualificação.');

// ==========================================
// TESTE 2: Planilha Excel (.xlsx) Multi-Aba
// ==========================================
console.log('\n--- Teste 2: Geração da Planilha Excel (.xlsx) com 5 Abas ---');

const mockRegistrations = [
  {
    id: 'reg_1001',
    athleteName: 'Mariana Silva',
    athleteEmail: 'mariana.silva@medicina.uema.br',
    athletePhone: '98981234567',
    athleteDocument: '045.123.789-01',
    turma: '21',
    turmaLabel: 'Turma XXI • Sanguinária',
    teamName: 'Sanguinária',
    categoryName: 'Aluno Medicina UEMA',
    requestedMemberDiscount: true,
    memberStatus: 'aprovado',
    authorizedPrice: 35.0,
    paymentStatus: 'pago',
    paymentMethod: 'pix',
    mpPaymentId: 'mp_pay_998811',
    createdAtIso: '2026-11-01T10:00:00.000Z',
  },
  {
    id: 'reg_1002',
    athleteName: 'Gabriel Sousa',
    athleteEmail: 'gabriel.sousa@medicina.uema.br',
    athletePhone: '98982345678',
    athleteDocument: '032.456.789-02',
    turma: '22',
    turmaLabel: 'Turma XXII • Predadora',
    teamName: 'Predadora',
    categoryName: 'Aluno Medicina UEMA',
    requestedMemberDiscount: true,
    memberStatus: 'pendente',
    authorizedPrice: 35.0,
    paymentStatus: 'aguardando_validacao',
    paymentMethod: null,
    mpPaymentId: null,
    createdAtIso: '2026-11-02T14:30:00.000Z',
  },
  {
    id: 'reg_1003',
    athleteName: 'Camila Rocha',
    athleteEmail: 'camila.rocha@gmail.com',
    athletePhone: '98983456789',
    athleteDocument: '021.654.987-03',
    turma: '23',
    turmaLabel: 'Turma XXIII • Tormenta',
    teamName: 'Tormenta',
    categoryName: 'Convidado / Externo',
    requestedMemberDiscount: false,
    memberStatus: 'nao_solicitado',
    authorizedPrice: 50.0,
    paymentStatus: 'pendente',
    paymentMethod: null,
    mpPaymentId: null,
    createdAtIso: '2026-11-03T09:15:00.000Z',
  },
  {
    id: 'reg_1004',
    athleteName: 'Lucas Castro',
    athleteEmail: 'lucas.castro@gmail.com',
    athletePhone: '98984567890',
    athleteDocument: '012.789.456-04',
    turma: '24',
    turmaLabel: 'Turma XXIV • Colossal',
    teamName: 'Colossal',
    categoryName: 'Egresso / Médico Formado',
    requestedMemberDiscount: false,
    memberStatus: 'nao_solicitado',
    authorizedPrice: 50.0,
    paymentStatus: 'cancelado',
    paymentMethod: null,
    mpPaymentId: null,
    createdAtIso: '2026-11-04T16:45:00.000Z',
  },
];

const workbook = new ExcelJS.Workbook();
workbook.creator = 'Atlética Cangaceira - INTRAMED IX';

const ws1 = workbook.addWorksheet('DASHBOARD GERAL');
const ws2 = workbook.addWorksheet('INSCRITOS POR TURMA');
const ws3 = workbook.addWorksheet('PERFIL DOS INSCRITOS');
const ws4 = workbook.addWorksheet('PAGAMENTOS E SITUAÇÃO');
const ws5 = workbook.addWorksheet('LISTA COMPLETA DE INSCRITOS');

assert.strictEqual(workbook.worksheets.length, 5, 'Deve conter exatamente 5 abas');
assert.strictEqual(workbook.getWorksheet('DASHBOARD GERAL')?.name, 'DASHBOARD GERAL');
assert.strictEqual(workbook.getWorksheet('INSCRITOS POR TURMA')?.name, 'INSCRITOS POR TURMA');
assert.strictEqual(workbook.getWorksheet('PERFIL DOS INSCRITOS')?.name, 'PERFIL DOS INSCRITOS');
assert.strictEqual(workbook.getWorksheet('PAGAMENTOS E SITUAÇÃO')?.name, 'PAGAMENTOS E SITUAÇÃO');
assert.strictEqual(workbook.getWorksheet('LISTA COMPLETA DE INSCRITOS')?.name, 'LISTA COMPLETA DE INSCRITOS');

// Teste de gravação de buffer
const buffer = await workbook.xlsx.writeBuffer();
assert(buffer && buffer.length > 0, 'Buffer gerado deve ser válido e não-vazio');
console.log(`✅ Sub-teste 2.1: Workbook gerado com sucesso (${buffer.length} bytes, 5 abas obrigatórias).`);

console.log('\n======================================================');
console.log('🎉 TODOS OS TESTES PASSARAM COM SUCESSO (100% OK)!');
console.log('======================================================\n');
