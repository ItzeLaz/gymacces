import { useState } from 'react';

const BAR_WIDTH = 10;
const HEIGHT = 100;

// "2026-10-12" → "12 oct"
function shortDay(fecha) {
  const [year, month, day] = fecha.split('-').map(Number);
  return new Date(year, month - 1, day)
    .toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
    .replace('.', '');
}

// Gráfica de barras por día en SVG, sin dependencias (research R-01). Cada barra lleva su valor
// en texto y la tabla alternativa repite los datos para no depender del color (FR-011).
export default function BarChart({ title, data, format = (valor) => String(valor) }) {
  const [showTable, setShowTable] = useState(false);
  const max = Math.max(...data.map((dia) => dia.valor), 0);
  const width = Math.max(data.length, 1) * BAR_WIDTH;

  return (
    <figure className="bar-chart">
      <figcaption>
        <span>{title}</span>
        <button type="button" className="btn btn-secondary" onClick={() => setShowTable((value) => !value)}>
          {showTable ? 'Ocultar datos' : 'Ver datos'}
        </button>
      </figcaption>
      <svg viewBox={`0 0 ${width} ${HEIGHT}`} preserveAspectRatio="none" role="img" aria-label={title}>
        {data.map((dia, index) => {
          const height = max === 0 ? 0 : (dia.valor / max) * (HEIGHT - 4);
          return (
            <rect
              key={dia.fecha}
              className="bar"
              x={index * BAR_WIDTH + 1}
              y={HEIGHT - height}
              width={BAR_WIDTH - 2}
              height={height}
            >
              <title>{`${shortDay(dia.fecha)}: ${format(dia.valor)}`}</title>
            </rect>
          );
        })}
      </svg>
      {data.length > 0 && (
        <div className="bar-chart-axis">
          <span>{shortDay(data[0].fecha)}</span>
          <span>{shortDay(data.at(-1).fecha)}</span>
        </div>
      )}
      {showTable && (
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Día</th>
              <th scope="col">Valor</th>
            </tr>
          </thead>
          <tbody>
            {data.map((dia) => (
              <tr key={dia.fecha}>
                <td>{shortDay(dia.fecha)}</td>
                <td>{format(dia.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </figure>
  );
}
