/* Mock data for the Cost-Mapper UI kit */
const MOCK_PROJECTS = [
  { id: 'p1', name: 'Vivienda unifamiliar — Lambaré', location: '/proyectos/2026/lambare-pillares' },
  { id: 'p2', name: 'Edificio Torre Yvy — Asunción', location: '/proyectos/2026/torre-yvy' },
  { id: 'p3', name: 'Galpón industrial Itauguá', location: '/proyectos/2025/itaugua-galpon' },
];

const FACETAS = ['3E', '4U', '2C', '2N', '2Q'];

const BUDGET_ROWS = [
  { type: 'group', faceta: '3E', label: 'Resultados de construcción', count: 8, subtotal: 186420500 },
  { type: 'row', id: 'r1', faceta: '3E', code: '3E.04.07.001', desc: 'Muro de mampostería 15cm', meta: 'Ladrillo cerámico hueco · Nivel 1-2', unit: 'm²',  qty: 142.80, price: 485000, total: 69258000 },
  { type: 'row', id: 'r2', faceta: '3E', code: '3E.04.07.005', desc: 'Losa H°A° 12cm', meta: 'Hormigón fck=21 MPa · Nivel 1', unit: 'm²', qty: 86.40, price: 920000, total: 79488000, selected: true },
  { type: 'row', id: 'r3', faceta: '3E', code: '3E.05.02.012', desc: 'Revoque interior fino', meta: 'Mortero 1:4 · una cara', unit: 'm²', qty: 142.80, price: 125000, total: 17850000 },
  { type: 'row', id: 'r4', faceta: '3E', code: '3E.06.01.020', desc: 'Pintura latex interior', meta: 'Dos manos sobre revoque', unit: 'm²', qty: 142.80, price: 49000, total: 6997200 },
  { type: 'row', id: 'r5', faceta: '3E', code: '3E.07.04.030', desc: 'Contrapiso de hormigón', meta: '8cm · alisado', unit: 'm²', qty: 86.40, price: 152000, total: 13132800 },
  { type: 'group', faceta: '2C', label: 'Componentes / Materiales', count: 24, subtotal: 94150000 },
  { type: 'row', id: 'r6',  faceta: '2C', code: '2C.03.01.045', desc: 'Cemento Portland CP-II', meta: 'Bolsa 50 kg', unit: 'bls', qty: 280, price: 62000, total: 17360000 },
  { type: 'row', id: 'r7',  faceta: '2C', code: '2C.06.04.118', desc: 'Hierro Ø10mm CA-50', meta: 'Barra 12m', unit: 'kg', qty: 1840, price: 8500, total: 15640000 },
  { type: 'row', id: 'r8',  faceta: '2C', code: '2C.06.04.122', desc: 'Hierro Ø8mm CA-50', meta: 'Barra 12m', unit: 'kg', qty: 920, price: 8200, total: 7544000 },
  { type: 'row', id: 'r9',  faceta: '2C', code: '2C.04.02.018', desc: 'Arena lavada para hormigón', meta: 'a granel', unit: 'm³', qty: 18, price: 145000, total: 2610000 },
  { type: 'group', faceta: '2N', label: 'Mano de obra', count: 6, subtotal: null },
  { type: 'row', id: 'r10', faceta: '2N', code: '2N.01.02.005', desc: 'Albañil oficial', meta: 'Carga horaria nivelada', unit: 'hr', qty: 320, price: 68000, total: 21760000 },
  { type: 'row', id: 'r11', faceta: '2N', code: '2N.01.02.012', desc: 'Ayudante de albañil', meta: 'Carga horaria nivelada', unit: 'hr', qty: 320, price: 42000, total: 13440000 },
  { type: 'row', id: 'r12', faceta: '2N', code: '2N.04.01.002', desc: 'Pintor profesional', meta: 'Sin precio asignado', unit: 'hr', qty: 48, price: null, total: null },
];

const BUDGET_TOTAL = 280570500;

const APU_ROWS = [
  { type: 'group', label: '2C · MATERIALES' },
  { type: 'row', id: 'a1', faceta: '2C', code: '2C.06.01.118', desc: 'Ladrillo cerámico hueco 15×20×30', unit: 'un',  coef: 28.00,  coefSource: 'TCPO v15', price: 2450,   priceSource: 'Custom' },
  { type: 'row', id: 'a2', faceta: '2C', code: '2C.03.01.045', desc: 'Mortero de asiento 1:4',           unit: 'm³',  coef: 0.021, coefSource: 'TCPO v15', price: 485000, priceSource: 'TCPO v15' },
  { type: 'group', label: '2N · MANO DE OBRA' },
  { type: 'row', id: 'a3', faceta: '2N', code: '2N.01.02.005', desc: 'Albañil oficial',                  unit: 'hr',  coef: 1.80,  coefSource: 'Custom',   price: 68000,  priceSource: 'Custom', editing: true },
  { type: 'row', id: 'a4', faceta: '2N', code: '2N.01.02.012', desc: 'Ayudante de albañil',              unit: 'hr',  coef: 1.80,  coefSource: 'TCPO v15', price: 42000,  priceSource: 'TCPO v15' },
  { type: 'group', label: '2Q · EQUIPOS' },
  { type: 'row', id: 'a5', faceta: '2Q', code: '2Q.04.01.030', desc: 'Andamio metálico (alquiler)',      unit: 'día', coef: 0.15,  coefSource: 'TCPO v15', price: 85000,  priceSource: 'Custom' },
];

const fmt = (n) => n == null ? '—' : n.toLocaleString('es-PY');

window.MOCK_PROJECTS = MOCK_PROJECTS;
window.FACETAS = FACETAS;
window.BUDGET_ROWS = BUDGET_ROWS;
window.BUDGET_TOTAL = BUDGET_TOTAL;
window.APU_ROWS = APU_ROWS;
window.fmt = fmt;
