import ExcelJS from 'exceljs';
import type { Registration } from '../types/domain';

interface TournamentMeta {
  title?: string;
  edition?: string;
  organization?: string;
}

export async function exportRegistrationsToExcel(
  registrations: Registration[],
  meta?: TournamentMeta
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Atlética Cangaceira - INTRAMED IX';
  workbook.lastModifiedBy = 'Atlética Cangaceira - INTRAMED IX';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Cores da Identidade Visual INTRAMED IX / Cangaceira
  const COLOR_NAVY = 'FF0B218A'; // #0B218A
  const COLOR_NAVY_LIGHT = 'FF1E3A8A'; // #1E3A8A
  const COLOR_GOLD = 'FFFACC15'; // #FACC15
  const COLOR_WHITE = 'FFFFFFFF';
  const COLOR_GRAY_HEADER = 'FF1E293B'; // #1E293B
  const COLOR_ZEBRA = 'FFF8FAFC'; // #F8FAFC
  const COLOR_BORDER = 'FFE2E8F0'; // #E2E8F0
  const COLOR_PAID_BG = 'FFECFDF5';
  const COLOR_PAID_FG = 'FF065F46';
  const COLOR_PENDING_BG = 'FFFFFBEB';
  const COLOR_PENDING_FG = 'FF92400E';
  const COLOR_CANCEL_BG = 'FFFEF2F2';
  const COLOR_CANCEL_FG = 'FF991B1B';

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: COLOR_BORDER } },
    left: { style: 'thin', color: { argb: COLOR_BORDER } },
    bottom: { style: 'thin', color: { argb: COLOR_BORDER } },
    right: { style: 'thin', color: { argb: COLOR_BORDER } },
  };

  const totalRegs = registrations.length;
  const paidRegs = registrations.filter((r) => r.paymentStatus === 'pago');
  const pendingRegs = registrations.filter(
    (r) => r.paymentStatus === 'pendente' || r.paymentStatus === 'aguardando_validacao' || r.paymentStatus === 'processando'
  );
  const cancelledRegs = registrations.filter(
    (r) => r.paymentStatus === 'cancelado' || r.paymentStatus === 'expirado'
  );

  const totalPaidRevenue = paidRegs.reduce((acc, r) => acc + (Number(r.authorizedPrice) || 0), 0);
  const totalExpectedRevenue = registrations.reduce((acc, r) => acc + (Number(r.authorizedPrice) || 0), 0);
  const totalPendingRevenue = pendingRegs.reduce((acc, r) => acc + (Number(r.authorizedPrice) || 0), 0);

  const membersCount = registrations.filter((r) => r.memberStatus === 'aprovado' || (r.requestedMemberDiscount && r.memberStatus !== 'rejeitado')).length;
  const nonMembersCount = totalRegs - membersCount;
  const pendingValidationCount = registrations.filter((r) => r.requestedMemberDiscount && r.memberStatus === 'pendente').length;
  const conversionRate = totalRegs > 0 ? (paidRegs.length / totalRegs) * 100 : 0;

  // ==========================================
  // ABA 1: DASHBOARD GERAL
  // ==========================================
  const ws1 = workbook.addWorksheet('DASHBOARD GERAL', {
    views: [{ showGridLines: true }],
  });

  // Título e Subtítulo
  ws1.mergeCells('B2:H2');
  const title1 = ws1.getCell('B2');
  title1.value = 'INTRAMED IX — PAINEL EXECUTIVO DE INSCRIÇÕES';
  title1.font = { name: 'Calibri', size: 16, bold: true, color: { argb: COLOR_WHITE } };
  title1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_NAVY } };
  title1.alignment = { vertical: 'middle', horizontal: 'center' };
  ws1.getRow(2).height = 36;

  ws1.mergeCells('B3:H3');
  const sub1 = ws1.getCell('B3');
  const genDateStr = new Date().toLocaleString('pt-BR');
  sub1.value = `Associação Atlética Acadêmica de Medicina UEMA – Cangaceira  •  Relatório Consolidado em: ${genDateStr}`;
  sub1.font = { name: 'Calibri', size: 10, italic: true, color: { argb: COLOR_GOLD } };
  sub1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_NAVY_LIGHT } };
  sub1.alignment = { vertical: 'middle', horizontal: 'center' };
  ws1.getRow(3).height = 22;

  // Seção 1: Indicadores Chave
  ws1.mergeCells('B5:H5');
  const s1 = ws1.getCell('B5');
  s1.value = '1. INDICADORES-CHAVE DE DESEMPENHO (KPIS)';
  s1.font = { name: 'Calibri', size: 12, bold: true, color: { argb: COLOR_NAVY } };
  ws1.getRow(5).height = 24;

  const renderKpiCard = (
    topCell: string,
    botCell: string,
    label: string,
    value: string | number,
    colorFg: string,
    colorBg: string
  ) => {
    ws1.mergeCells(`${topCell}:${botCell}`);
    const cell = ws1.getCell(topCell);
    cell.value = `${value}\n${label}`;
    cell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: colorFg } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorBg } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = thinBorder;
  };

  // Linha 1 de Cards
  renderKpiCard('B6', 'C7', 'TOTAL DE INSCRITOS', totalRegs, COLOR_WHITE, COLOR_NAVY);
  renderKpiCard('D6', 'E7', 'INSCRIÇÕES CONFIRMADAS (PAGAS)', paidRegs.length, COLOR_PAID_FG, COLOR_PAID_BG);
  renderKpiCard('F6', 'G7', 'INSCRIÇÕES PENDENTES', pendingRegs.length, COLOR_PENDING_FG, COLOR_PENDING_BG);
  renderKpiCard('H6', 'H7', 'CANCELADAS', cancelledRegs.length, COLOR_CANCEL_FG, COLOR_CANCEL_BG);

  // Linha 2 de Cards
  renderKpiCard('B9', 'C10', 'TAXA DE CONFIRMAÇÃO', `${conversionRate.toFixed(1)}%`, COLOR_NAVY, 'FFF1F5F9');
  renderKpiCard('D9', 'E10', 'SÓCIOS CANGACEIRA', membersCount, COLOR_NAVY, 'FFF1F5F9');
  renderKpiCard('F9', 'G10', 'NÃO-SÓCIOS (GERAL)', nonMembersCount, COLOR_NAVY, 'FFF1F5F9');
  renderKpiCard('H9', 'H10', 'SÓCIOS A VALIDAR', pendingValidationCount, COLOR_PENDING_FG, COLOR_PENDING_BG);

  // Seção 2: Resumo Financeiro
  ws1.mergeCells('B12:H12');
  const s2 = ws1.getCell('B12');
  s2.value = '2. CONSOLIDAÇÃO FINANCEIRA DO EVENTO';
  s2.font = { name: 'Calibri', size: 12, bold: true, color: { argb: COLOR_NAVY } };
  ws1.getRow(12).height = 24;

  const finHeaders = ['Item Financeiro', 'Valor Total (R$)', '% da Receita Prevista'];
  const finRow = ws1.getRow(13);
  finHeaders.forEach((h, idx) => {
    const colLetter = idx === 0 ? 'B' : idx === 1 ? 'E' : 'G';
    const endLetter = idx === 0 ? 'D' : idx === 1 ? 'F' : 'H';
    ws1.mergeCells(`${colLetter}13:${endLetter}13`);
    const c = ws1.getCell(`${colLetter}13`);
    c.value = h;
    c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLOR_WHITE } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_GRAY_HEADER } };
    c.alignment = { vertical: 'middle', horizontal: 'center' };
    c.border = thinBorder;
  });
  finRow.height = 22;

  const finData = [
    {
      label: 'Receita Confirmada (Inscrições Pagas)',
      val: totalPaidRevenue,
      pct: totalExpectedRevenue > 0 ? (totalPaidRevenue / totalExpectedRevenue) * 100 : 0,
      bg: COLOR_PAID_BG,
    },
    {
      label: 'Receita Prevista em Aberto (Pendentes)',
      val: totalPendingRevenue,
      pct: totalExpectedRevenue > 0 ? (totalPendingRevenue / totalExpectedRevenue) * 100 : 0,
      bg: COLOR_PENDING_BG,
    },
    {
      label: 'Volume Potencial Total (100% dos Inscritos)',
      val: totalExpectedRevenue,
      pct: 100,
      bg: 'FFF1F5F9',
    },
  ];

  finData.forEach((row, i) => {
    const rIdx = 14 + i;
    ws1.mergeCells(`B${rIdx}:D${rIdx}`);
    ws1.mergeCells(`E${rIdx}:F${rIdx}`);
    ws1.mergeCells(`G${rIdx}:H${rIdx}`);

    const c1 = ws1.getCell(`B${rIdx}`);
    c1.value = row.label;
    c1.font = { name: 'Calibri', size: 10, bold: i === 2 };
    c1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: row.bg } };
    c1.alignment = { vertical: 'middle', horizontal: 'left' };
    c1.border = thinBorder;

    const c2 = ws1.getCell(`E${rIdx}`);
    c2.value = row.val;
    c2.numFmt = '"R$ "#,##0.00';
    c2.font = { name: 'Calibri', size: 10, bold: i === 2 };
    c2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: row.bg } };
    c2.alignment = { vertical: 'middle', horizontal: 'right' };
    c2.border = thinBorder;

    const c3 = ws1.getCell(`G${rIdx}`);
    c3.value = `${row.pct.toFixed(1)}%`;
    c3.font = { name: 'Calibri', size: 10, bold: i === 2 };
    c3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: row.bg } };
    c3.alignment = { vertical: 'middle', horizontal: 'center' };
    c3.border = thinBorder;

    ws1.getRow(rIdx).height = 20;
  });

  ws1.getColumn('A').width = 4;
  ws1.getColumn('B').width = 16;
  ws1.getColumn('C').width = 16;
  ws1.getColumn('D').width = 16;
  ws1.getColumn('E').width = 16;
  ws1.getColumn('F').width = 16;
  ws1.getColumn('G').width = 16;
  ws1.getColumn('H').width = 16;

  // ==========================================
  // ABA 2: INSCRITOS POR TURMA
  // ==========================================
  const ws2 = workbook.addWorksheet('INSCRITOS POR TURMA', {
    views: [{ showGridLines: true }],
  });

  ws2.mergeCells('A1:I1');
  const t2 = ws2.getCell('A1');
  t2.value = 'DISTRIBUIÇÃO DE INSCRIÇÕES POR TURMA / EQUIPE';
  t2.font = { name: 'Calibri', size: 14, bold: true, color: { argb: COLOR_WHITE } };
  t2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_NAVY } };
  t2.alignment = { vertical: 'middle', horizontal: 'center' };
  ws2.getRow(1).height = 30;

  const turmaHeaders = [
    'Turma / Equipe',
    'Total Inscritos',
    'Pagos (Confirmados)',
    'Pendentes',
    'Sócios Cangaceira',
    'Não-Sócios',
    '% do Total',
    'Receita Confirmada (R$)',
    'Receita Pendente (R$)',
  ];

  const headerRow2 = ws2.getRow(3);
  turmaHeaders.forEach((th, idx) => {
    const c = headerRow2.getCell(idx + 1);
    c.value = th;
    c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLOR_WHITE } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_NAVY } };
    c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    c.border = thinBorder;
  });
  headerRow2.height = 26;

  // Agrupa por turma
  const turmaMap = new Map<
    string,
    {
      total: number;
      paid: number;
      pending: number;
      members: number;
      nonMembers: number;
      paidRev: number;
      pendingRev: number;
    }
  >();

  registrations.forEach((r) => {
    const turmaName = r.turmaLabel || r.teamName || (r.turma ? `Turma ${r.turma}` : 'Sem Turma');
    const cur = turmaMap.get(turmaName) || {
      total: 0,
      paid: 0,
      pending: 0,
      members: 0,
      nonMembers: 0,
      paidRev: 0,
      pendingRev: 0,
    };
    cur.total += 1;
    if (r.paymentStatus === 'pago') {
      cur.paid += 1;
      cur.paidRev += Number(r.authorizedPrice) || 0;
    } else if (r.paymentStatus === 'pendente') {
      cur.pending += 1;
      cur.pendingRev += Number(r.authorizedPrice) || 0;
    }

    if (r.memberStatus === 'aprovado' || (r.requestedMemberDiscount && r.memberStatus !== 'rejeitado')) {
      cur.members += 1;
    } else {
      cur.nonMembers += 1;
    }
    turmaMap.set(turmaName, cur);
  });

  const sortedTurmas = Array.from(turmaMap.entries()).sort((a, b) => b[1].total - a[1].total);

  sortedTurmas.forEach(([turmaName, data], index) => {
    const rowIdx = 4 + index;
    const row = ws2.getRow(rowIdx);
    const isZebra = index % 2 === 1;
    const bg = isZebra ? COLOR_ZEBRA : COLOR_WHITE;

    const pct = totalRegs > 0 ? (data.total / totalRegs) * 100 : 0;

    row.getCell(1).value = turmaName;
    row.getCell(2).value = data.total;
    row.getCell(3).value = data.paid;
    row.getCell(4).value = data.pending;
    row.getCell(5).value = data.members;
    row.getCell(6).value = data.nonMembers;
    row.getCell(7).value = `${pct.toFixed(1)}%`;
    row.getCell(8).value = data.paidRev;
    row.getCell(9).value = data.pendingRev;

    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(8).alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell(9).alignment = { vertical: 'middle', horizontal: 'right' };

    row.getCell(8).numFmt = '"R$ "#,##0.00';
    row.getCell(9).numFmt = '"R$ "#,##0.00';

    for (let c = 1; c <= 9; c++) {
      const cell = row.getCell(c);
      cell.font = { name: 'Calibri', size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      cell.border = thinBorder;
    }
    row.height = 20;
  });

  // Linha de Total Geral
  const totalTurmaRowIdx = 4 + sortedTurmas.length;
  const totRow2 = ws2.getRow(totalTurmaRowIdx);
  totRow2.getCell(1).value = 'TOTAL GERAL';
  totRow2.getCell(2).value = totalRegs;
  totRow2.getCell(3).value = paidRegs.length;
  totRow2.getCell(4).value = pendingRegs.length;
  totRow2.getCell(5).value = membersCount;
  totRow2.getCell(6).value = nonMembersCount;
  totRow2.getCell(7).value = '100.0%';
  totRow2.getCell(8).value = totalPaidRevenue;
  totRow2.getCell(9).value = totalPendingRevenue;

  totRow2.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
  totRow2.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
  totRow2.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
  totRow2.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
  totRow2.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };
  totRow2.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };
  totRow2.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };
  totRow2.getCell(8).alignment = { vertical: 'middle', horizontal: 'right' };
  totRow2.getCell(9).alignment = { vertical: 'middle', horizontal: 'right' };
  totRow2.getCell(8).numFmt = '"R$ "#,##0.00';
  totRow2.getCell(9).numFmt = '"R$ "#,##0.00';

  for (let c = 1; c <= 9; c++) {
    const cell = totRow2.getCell(c);
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLOR_WHITE } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_NAVY_LIGHT } };
    cell.border = thinBorder;
  }
  totRow2.height = 24;

  ws2.getColumn(1).width = 24;
  ws2.getColumn(2).width = 16;
  ws2.getColumn(3).width = 18;
  ws2.getColumn(4).width = 16;
  ws2.getColumn(5).width = 18;
  ws2.getColumn(6).width = 16;
  ws2.getColumn(7).width = 14;
  ws2.getColumn(8).width = 22;
  ws2.getColumn(9).width = 22;

  // ==========================================
  // ABA 3: PERFIL DOS INSCRITOS
  // ==========================================
  const ws3 = workbook.addWorksheet('PERFIL DOS INSCRITOS', {
    views: [{ showGridLines: true }],
  });

  ws3.mergeCells('A1:G1');
  const t3 = ws3.getCell('A1');
  t3.value = 'PERFIL E CATEGORIAS DOS INSCRITOS (DADOS DO FORMULÁRIO)';
  t3.font = { name: 'Calibri', size: 14, bold: true, color: { argb: COLOR_WHITE } };
  t3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_NAVY } };
  t3.alignment = { vertical: 'middle', horizontal: 'center' };
  ws3.getRow(1).height = 30;

  // Subseção 1: Distribuição por Categoria
  ws3.mergeCells('A3:G3');
  const catTitle = ws3.getCell('A3');
  catTitle.value = '1. CATEGORIA DE PARTICIPAÇÃO DECLARADA';
  catTitle.font = { name: 'Calibri', size: 11, bold: true, color: { argb: COLOR_NAVY } };

  const catHeaders = ['Categoria', 'Quantidade', '% do Total', 'Pagos', 'Pendentes', 'Cancelados', 'Receita Confirmada (R$)'];
  const catHeaderRow = ws3.getRow(4);
  catHeaders.forEach((h, idx) => {
    const c = catHeaderRow.getCell(idx + 1);
    c.value = h;
    c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLOR_WHITE } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_GRAY_HEADER } };
    c.alignment = { vertical: 'middle', horizontal: 'center' };
    c.border = thinBorder;
  });
  catHeaderRow.height = 22;

  const categoryMap = new Map<string, { total: number; paid: number; pending: number; cancelled: number; paidRev: number }>();
  registrations.forEach((r) => {
    const cat = r.categoryName || 'Não Informado';
    const cur = categoryMap.get(cat) || { total: 0, paid: 0, pending: 0, cancelled: 0, paidRev: 0 };
    cur.total += 1;
    if (r.paymentStatus === 'pago') {
      cur.paid += 1;
      cur.paidRev += Number(r.authorizedPrice) || 0;
    } else if (r.paymentStatus === 'pendente') {
      cur.pending += 1;
    } else {
      cur.cancelled += 1;
    }
    categoryMap.set(cat, cur);
  });

  let catRowIdx = 5;
  Array.from(categoryMap.entries()).forEach(([cat, data], idx) => {
    const row = ws3.getRow(catRowIdx);
    const bg = idx % 2 === 1 ? COLOR_ZEBRA : COLOR_WHITE;
    const pct = totalRegs > 0 ? (data.total / totalRegs) * 100 : 0;

    row.getCell(1).value = cat;
    row.getCell(2).value = data.total;
    row.getCell(3).value = `${pct.toFixed(1)}%`;
    row.getCell(4).value = data.paid;
    row.getCell(5).value = data.pending;
    row.getCell(6).value = data.cancelled;
    row.getCell(7).value = data.paidRev;

    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(7).alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell(7).numFmt = '"R$ "#,##0.00';

    for (let c = 1; c <= 7; c++) {
      const cell = row.getCell(c);
      cell.font = { name: 'Calibri', size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      cell.border = thinBorder;
    }
    row.height = 20;
    catRowIdx++;
  });

  // Subseção 2: Condição de Sócio
  const socioTitleIdx = catRowIdx + 2;
  ws3.mergeCells(`A${socioTitleIdx}:G${socioTitleIdx}`);
  const socioTitle = ws3.getCell(`A${socioTitleIdx}`);
  socioTitle.value = '2. CONDIÇÃO DE ASSOCIAÇÃO À ATLÉTICA CANGACEIRA';
  socioTitle.font = { name: 'Calibri', size: 11, bold: true, color: { argb: COLOR_NAVY } };

  const socioHeaders = ['Condição de Associação', 'Quantidade', '% do Total', 'Validação da Diretoria', 'Receita Confirmada (R$)'];
  const socioHeaderRow = ws3.getRow(socioTitleIdx + 1);
  socioHeaders.forEach((h, idx) => {
    const c = socioHeaderRow.getCell(idx + 1);
    c.value = h;
    c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLOR_WHITE } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_GRAY_HEADER } };
    c.alignment = { vertical: 'middle', horizontal: 'center' };
    c.border = thinBorder;
  });
  socioHeaderRow.height = 22;

  const socioData = [
    {
      label: 'Sócio Aprovado (Desconto Autorizado)',
      count: registrations.filter((r) => r.memberStatus === 'aprovado').length,
      status: 'Aprovado / Regular',
      rev: registrations
        .filter((r) => r.memberStatus === 'aprovado' && r.paymentStatus === 'pago')
        .reduce((a, b) => a + (Number(b.authorizedPrice) || 0), 0),
    },
    {
      label: 'Sócio Solicitado (Aguardando Validação)',
      count: pendingValidationCount,
      status: 'Pendente de Comprovação',
      rev: registrations
        .filter((r) => r.requestedMemberDiscount && r.memberStatus === 'pendente' && r.paymentStatus === 'pago')
        .reduce((a, b) => a + (Number(b.authorizedPrice) || 0), 0),
    },
    {
      label: 'Não-Sócio / Geral (Sem Desconto)',
      count: nonMembersCount,
      status: 'Sem Vínculo de Sócio',
      rev: registrations
        .filter((r) => !r.requestedMemberDiscount && r.paymentStatus === 'pago')
        .reduce((a, b) => a + (Number(b.authorizedPrice) || 0), 0),
    },
  ];

  socioData.forEach((sd, i) => {
    const rIdx = socioTitleIdx + 2 + i;
    const row = ws3.getRow(rIdx);
    const bg = i % 2 === 1 ? COLOR_ZEBRA : COLOR_WHITE;
    const pct = totalRegs > 0 ? (sd.count / totalRegs) * 100 : 0;

    row.getCell(1).value = sd.label;
    row.getCell(2).value = sd.count;
    row.getCell(3).value = `${pct.toFixed(1)}%`;
    row.getCell(4).value = sd.status;
    row.getCell(5).value = sd.rev;

    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(5).alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell(5).numFmt = '"R$ "#,##0.00';

    for (let c = 1; c <= 5; c++) {
      const cell = row.getCell(c);
      cell.font = { name: 'Calibri', size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      cell.border = thinBorder;
    }
    row.height = 20;
  });

  ws3.getColumn(1).width = 32;
  ws3.getColumn(2).width = 16;
  ws3.getColumn(3).width = 16;
  ws3.getColumn(4).width = 24;
  ws3.getColumn(5).width = 24;
  ws3.getColumn(6).width = 16;
  ws3.getColumn(7).width = 22;

  // ==========================================
  // ABA 4: PAGAMENTOS E SITUAÇÃO
  // ==========================================
  const ws4 = workbook.addWorksheet('PAGAMENTOS E SITUAÇÃO', {
    views: [{ showGridLines: true }],
  });

  ws4.mergeCells('A1:F1');
  const t4 = ws4.getCell('A1');
  t4.value = 'STATUS DE PAGAMENTOS E CONSOLIDAÇÃO FINANCEIRA';
  t4.font = { name: 'Calibri', size: 14, bold: true, color: { argb: COLOR_WHITE } };
  t4.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_NAVY } };
  t4.alignment = { vertical: 'middle', horizontal: 'center' };
  ws4.getRow(1).height = 30;

  // Tabela 1: Situação das Inscrições
  ws4.mergeCells('A3:F3');
  const sitTitle = ws4.getCell('A3');
  sitTitle.value = '1. DISTRIBUIÇÃO POR STATUS DE PAGAMENTO';
  sitTitle.font = { name: 'Calibri', size: 11, bold: true, color: { argb: COLOR_NAVY } };

  const sitHeaders = ['Status Pagamento', 'Inscrições', '% do Total', 'Volume Arrecadado (R$)', 'Volume Pendente (R$)'];
  const sitHeaderRow = ws4.getRow(4);
  sitHeaders.forEach((h, idx) => {
    const c = sitHeaderRow.getCell(idx + 1);
    c.value = h;
    c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLOR_WHITE } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_GRAY_HEADER } };
    c.alignment = { vertical: 'middle', horizontal: 'center' };
    c.border = thinBorder;
  });
  sitHeaderRow.height = 22;

  const sitData = [
    {
      status: 'PAGO / CONFIRMADO',
      count: paidRegs.length,
      paidRev: totalPaidRevenue,
      pendRev: 0,
      bg: COLOR_PAID_BG,
    },
    {
      status: 'PENDENTE DE PAGAMENTO',
      count: pendingRegs.length,
      paidRev: 0,
      pendRev: totalPendingRevenue,
      bg: COLOR_PENDING_BG,
    },
    {
      status: 'CANCELADO / REJEITADO',
      count: cancelledRegs.length,
      paidRev: 0,
      pendRev: 0,
      bg: COLOR_CANCEL_BG,
    },
  ];

  sitData.forEach((sd, i) => {
    const rIdx = 5 + i;
    const row = ws4.getRow(rIdx);
    const pct = totalRegs > 0 ? (sd.count / totalRegs) * 100 : 0;

    row.getCell(1).value = sd.status;
    row.getCell(2).value = sd.count;
    row.getCell(3).value = `${pct.toFixed(1)}%`;
    row.getCell(4).value = sd.paidRev;
    row.getCell(5).value = sd.pendRev;

    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(4).alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell(5).alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell(4).numFmt = '"R$ "#,##0.00';
    row.getCell(5).numFmt = '"R$ "#,##0.00';

    for (let c = 1; c <= 5; c++) {
      const cell = row.getCell(c);
      cell.font = { name: 'Calibri', size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: sd.bg } };
      cell.border = thinBorder;
    }
    row.height = 20;
  });

  // Tabela 2: Formas de Pagamento
  ws4.mergeCells('A10:F10');
  const paymTitle = ws4.getCell('A10');
  paymTitle.value = '2. FORMAS DE PAGAMENTO REGISTRADAS';
  paymTitle.font = { name: 'Calibri', size: 11, bold: true, color: { argb: COLOR_NAVY } };

  const paymHeaders = ['Método de Pagamento', 'Inscrições', '% das Transações', 'Volume Confirmado (R$)'];
  const paymHeaderRow = ws4.getRow(11);
  paymHeaders.forEach((h, idx) => {
    const c = paymHeaderRow.getCell(idx + 1);
    c.value = h;
    c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLOR_WHITE } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_GRAY_HEADER } };
    c.alignment = { vertical: 'middle', horizontal: 'center' };
    c.border = thinBorder;
  });
  paymHeaderRow.height = 22;

  const methodMap = new Map<string, { count: number; rev: number }>();
  registrations.forEach((r) => {
    const m = r.paymentMethod || (r.mpPaymentId ? 'Mercado Pago (PIX)' : 'Aguardando Pagamento');
    const cur = methodMap.get(m) || { count: 0, rev: 0 };
    cur.count += 1;
    if (r.paymentStatus === 'pago') {
      cur.rev += Number(r.authorizedPrice) || 0;
    }
    methodMap.set(m, cur);
  });

  let pRowIdx = 12;
  Array.from(methodMap.entries()).forEach(([meth, data], idx) => {
    const row = ws4.getRow(pRowIdx);
    const bg = idx % 2 === 1 ? COLOR_ZEBRA : COLOR_WHITE;
    const pct = totalRegs > 0 ? (data.count / totalRegs) * 100 : 0;

    row.getCell(1).value = meth;
    row.getCell(2).value = data.count;
    row.getCell(3).value = `${pct.toFixed(1)}%`;
    row.getCell(4).value = data.rev;

    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(4).alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell(4).numFmt = '"R$ "#,##0.00';

    for (let c = 1; c <= 4; c++) {
      const cell = row.getCell(c);
      cell.font = { name: 'Calibri', size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      cell.border = thinBorder;
    }
    row.height = 20;
    pRowIdx++;
  });

  ws4.getColumn(1).width = 28;
  ws4.getColumn(2).width = 16;
  ws4.getColumn(3).width = 18;
  ws4.getColumn(4).width = 24;
  ws4.getColumn(5).width = 24;

  // ==========================================
  // ABA 5: LISTA COMPLETA DE INSCRITOS
  // ==========================================
  const ws5 = workbook.addWorksheet('LISTA COMPLETA DE INSCRITOS', {
    views: [{ state: 'frozen', ySplit: 4, showGridLines: true }],
  });

  ws5.mergeCells('A1:O1');
  const t5 = ws5.getCell('A1');
  t5.value = 'RELAÇÃO NOMINAL COMPLETA DE INSCRITOS — INTRAMED IX';
  t5.font = { name: 'Calibri', size: 14, bold: true, color: { argb: COLOR_WHITE } };
  t5.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_NAVY } };
  t5.alignment = { vertical: 'middle', horizontal: 'center' };
  ws5.getRow(1).height = 32;

  ws5.mergeCells('A2:O2');
  const sub5 = ws5.getCell('A2');
  sub5.value = `Atlética Cangaceira  •  Total de Cadastros: ${totalRegs}  •  Exportação Oficial do Sistema IntraMed`;
  sub5.font = { name: 'Calibri', size: 10, italic: true, color: { argb: COLOR_GOLD } };
  sub5.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_NAVY_LIGHT } };
  sub5.alignment = { vertical: 'middle', horizontal: 'center' };
  ws5.getRow(2).height = 20;

  const fullHeaders = [
    'ID Inscrição',
    'Nome do Atleta',
    'E-mail',
    'Telefone / WhatsApp',
    'CPF / Documento',
    'Turma / Equipe',
    'Categoria',
    'Solicitou Sócio?',
    'Status Sócio',
    'Preço Autorizado (R$)',
    'Status Pagamento',
    'Método Pagamento',
    'ID Mercado Pago',
    'Data da Inscrição',
    'Habilitado Atleta',
  ];

  const headerRow5 = ws5.getRow(4);
  fullHeaders.forEach((h, idx) => {
    const c = headerRow5.getCell(idx + 1);
    c.value = h;
    c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLOR_WHITE } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_NAVY } };
    c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    c.border = thinBorder;
  });
  headerRow5.height = 26;
  ws5.autoFilter = 'A4:O4';

  registrations.forEach((r, idx) => {
    const rIdx = 5 + idx;
    const row = ws5.getRow(rIdx);
    const isZebra = idx % 2 === 1;
    let bg = isZebra ? COLOR_ZEBRA : COLOR_WHITE;

    const price = Number(r.authorizedPrice) || 0;
    const isPaid = r.paymentStatus === 'pago';
    const isPending = r.paymentStatus === 'pendente';

    let dateFormatted = r.createdAtIso || '—';
    try {
      if (r.createdAtIso) {
        dateFormatted = new Date(r.createdAtIso).toLocaleString('pt-BR');
      }
    } catch {
      // Keep original
    }

    row.getCell(1).value = r.id;
    row.getCell(2).value = r.athleteName;
    row.getCell(3).value = r.athleteEmail;
    row.getCell(4).value = r.athletePhone || '—';
    row.getCell(5).value = r.athleteDocument || '—';
    row.getCell(6).value = r.turmaLabel || r.teamName || (r.turma ? `Turma ${r.turma}` : '—');
    row.getCell(7).value = r.categoryName || '—';
    row.getCell(8).value = r.requestedMemberDiscount ? 'SIM' : 'NÃO';
    row.getCell(9).value = (r.memberStatus || '—').toUpperCase();
    row.getCell(10).value = price;
    row.getCell(11).value = (r.paymentStatus || '—').toUpperCase();
    row.getCell(12).value = r.paymentMethod || '—';
    row.getCell(13).value = r.mpPaymentId || '—';
    row.getCell(14).value = dateFormatted;
    row.getCell(15).value = isPaid ? 'SIM (Apto)' : 'NÃO (Pendente)';

    // Alinhamentos
    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell(3).alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(6).alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell(7).alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell(8).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(9).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(10).alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell(11).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(12).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(13).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(14).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(15).alignment = { vertical: 'middle', horizontal: 'center' };

    row.getCell(10).numFmt = '"R$ "#,##0.00';

    for (let c = 1; c <= 15; c++) {
      const cell = row.getCell(c);
      cell.font = { name: 'Calibri', size: 9 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      cell.border = thinBorder;
    }

    // Cores condicionais na célula de status de pagamento
    const statusCell = row.getCell(11);
    if (isPaid) {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_PAID_BG } };
      statusCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: COLOR_PAID_FG } };
    } else if (isPending) {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_PENDING_BG } };
      statusCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: COLOR_PENDING_FG } };
    } else {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_CANCEL_BG } };
      statusCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: COLOR_CANCEL_FG } };
    }

    row.height = 20;
  });

  // Ajuste de largura das colunas da lista completa
  ws5.getColumn(1).width = 24; // ID Inscrição
  ws5.getColumn(2).width = 28; // Nome Atleta
  ws5.getColumn(3).width = 26; // Email
  ws5.getColumn(4).width = 18; // Telefone
  ws5.getColumn(5).width = 16; // Documento
  ws5.getColumn(6).width = 20; // Turma
  ws5.getColumn(7).width = 22; // Categoria
  ws5.getColumn(8).width = 16; // Solicitou Sócio
  ws5.getColumn(9).width = 16; // Status Sócio
  ws5.getColumn(10).width = 20; // Preço
  ws5.getColumn(11).width = 20; // Status Pagamento
  ws5.getColumn(12).width = 18; // Método
  ws5.getColumn(13).width = 20; // ID Mercado Pago
  ws5.getColumn(14).width = 20; // Data
  ws5.getColumn(15).width = 18; // Habilitado

  // Gerar buffer e download no navegador
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `relatorio-oficial-inscricoes-intramed-ix-${new Date().toISOString().slice(0, 10)}.xlsx`;
  anchor.click();
  window.URL.revokeObjectURL(url);
}
