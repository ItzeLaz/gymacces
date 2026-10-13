import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BarChart from '../components/BarChart.jsx';

const DATA = [
  { fecha: '2026-10-10', valor: 3 },
  { fecha: '2026-10-11', valor: 0 },
  { fecha: '2026-10-12', valor: 7 },
];

describe('gráfica de barras', () => {
  it('dibuja_una_barra_por_dia_con_su_valor_en_texto', () => {
    const { container } = render(<BarChart title="Accesos por día" data={DATA} />);
    expect(container.querySelectorAll('rect.bar')).toHaveLength(3);
    const titulos = [...container.querySelectorAll('rect.bar title')].map((node) => node.textContent);
    expect(titulos).toEqual(['10 oct: 3', '11 oct: 0', '12 oct: 7']);
  });

  it('la_tabla_alternativa_muestra_los_mismos_valores', () => {
    render(<BarChart title="Ingresos por día" data={DATA} format={(valor) => `$${valor}`} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ver datos' }));
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('$7')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ocultar datos' })).toBeInTheDocument();
  });

  it('con_todos_los_valores_en_cero_no_falla', () => {
    const { container } = render(<BarChart title="Vacía" data={DATA.map((d) => ({ ...d, valor: 0 }))} />);
    expect(container.querySelectorAll('rect.bar')).toHaveLength(3);
  });
});
