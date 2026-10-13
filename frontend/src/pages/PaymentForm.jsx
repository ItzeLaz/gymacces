import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getClientPayments, registerPayment } from '../api/payments.js';
import { fieldErrors } from '../api/client.js';
import Message from '../components/Message.jsx';
import Money, { formatMoney } from '../components/Money.jsx';
import { formatDay } from '../utils/dates.js';

const AMOUNT_PATTERN = /^\d{1,8}(\.\d{1,2})?$/;
const METHODS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'transferencia', label: 'Transferencia' },
];

const toCents = (value) => Math.round(Number(value) * 100);

export default function PaymentForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pendientes, setPendientes] = useState(null);
  const [idMembresia, setIdMembresia] = useState('');
  const [monto, setMonto] = useState('');
  const [metodo, setMetodo] = useState('efectivo');
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState({ type: 'success', text: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getClientPayments(id)
      .then(({ membresias }) => {
        const conSaldo = membresias.filter((m) => m.estado !== 'cancelada' && toCents(m.saldo) > 0);
        setPendientes(conSaldo);
        if (conSaldo.length > 0) {
          setIdMembresia(String(conSaldo[0].id_membresia));
          setMonto(conSaldo[0].saldo);
        }
      })
      .catch((error) => setMessage({ type: 'error', text: error.message }));
  }, [id]);

  const membresia = pendientes?.find((m) => String(m.id_membresia) === idMembresia);

  const selectMembership = (value) => {
    setIdMembresia(value);
    const elegida = pendientes.find((m) => String(m.id_membresia) === value);
    if (elegida) setMonto(elegida.saldo);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const localErrors = {};
    const texto = String(monto).trim();
    if (!AMOUNT_PATTERN.test(texto) || toCents(texto) <= 0) {
      localErrors.monto = 'El monto debe ser mayor a cero, con hasta 2 decimales.';
    } else if (membresia && toCents(texto) > toCents(membresia.saldo)) {
      localErrors.monto = `El monto no puede superar el saldo pendiente de ${formatMoney(membresia.saldo)}.`;
    }
    setErrors(localErrors);
    setMessage({ type: 'success', text: '' });
    if (Object.keys(localErrors).length > 0) return;

    setSaving(true);
    try {
      await registerPayment({ id_membresia: Number(idMembresia), monto: Number(texto).toFixed(2), metodo_pago: metodo });
      navigate(`/clients/${id}`, { state: { message: 'Pago registrado correctamente.' } });
    } catch (error) {
      setErrors(fieldErrors(error));
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card">
      <h1>Registrar pago</h1>
      <Message type={message.type}>{message.text}</Message>

      {!pendientes ? (
        <p>Cargando membresías…</p>
      ) : pendientes.length === 0 ? (
        <p role="status">El cliente no tiene membresías con saldo pendiente.</p>
      ) : (
        <form className="form" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="id_membresia">Membresía</label>
            <select id="id_membresia" value={idMembresia} onChange={(event) => selectMembership(event.target.value)}>
              {pendientes.map((m) => (
                <option key={m.id_membresia} value={String(m.id_membresia)}>
                  {m.tipo.nombre} · {formatDay(m.fecha_inicio)} al {formatDay(m.fecha_fin)}
                </option>
              ))}
            </select>
          </div>

          {membresia && (
            <p role="status">
              Saldo pendiente: <Money value={membresia.saldo} /> de <Money value={membresia.monto} />
            </p>
          )}

          <div className="field">
            <label htmlFor="monto">Monto</label>
            <input
              id="monto"
              type="text"
              inputMode="decimal"
              value={monto}
              onChange={(event) => setMonto(event.target.value)}
              aria-invalid={Boolean(errors.monto)}
            />
            <span className="field-hint">Se permiten abonos menores al saldo.</span>
            {errors.monto && <span className="field-error">{errors.monto}</span>}
          </div>

          <div className="field">
            <label htmlFor="metodo_pago">Método de pago</label>
            <select id="metodo_pago" value={metodo} onChange={(event) => setMetodo(event.target.value)}>
              {METHODS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            {errors.metodo_pago && <span className="field-error">{errors.metodo_pago}</span>}
          </div>

          <div className="actions">
            <button type="submit" className="btn" disabled={saving}>
              {saving ? 'Guardando…' : 'Registrar pago'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate(`/clients/${id}`)}>
              Volver
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
