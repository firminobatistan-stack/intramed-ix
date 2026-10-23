import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido. Utilize GET.' });
  }

  const eventData = {
    id: 'intramed-ix-2026',
    title: 'INTRAMED IX — Jogos Universitários de Medicina',
    edition: 'IX',
    year: 2026,
    description:
      'Competição esportiva universitária de Medicina organizada pela A.A.A. Cangaceira.',
    startDate: '2026-11-12T08:00:00Z',
    endDate: '2026-11-15T22:00:00Z',
    status: 'open_for_registrations',
    activeLot: {
      id: 'lote-1-cangaceira',
      name: '1º Lote Oficial — IntraMed IX',
      priceMember: 45.0,
      priceNonMember: 80.0,
      isActive: true,
    },
  };

  return res.status(200).json(eventData);
}
