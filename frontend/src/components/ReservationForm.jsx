import { useState } from 'react';
import { listClients } from '../api/clients.js';
import { createReservation } from '../api/reservations.js';
import Message from './Message.jsx';

// Busca un cliente activo y le reserva un lugar en la sesión (US2). El servidor valida membresía,
// duplicados, empalmes y cupo; aquí solo se muestra su mensaje.
export default function ReservationForm({ idClase, fechaSesion, onReserved }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState(null);
  const [message, setMessage] = useState({ type: 'success', text: '' });
  const [busy, setBusy] = useState(false);

  const handleSearch = async (event) => {
    event.preventDefault();
    const texto = search.trim();
    if (!texto) {
      setMessage({ type: 'error', text: 'Escribe el nombre, apellido o correo del cliente.' });
      return;
    }
    setBusy(true);
    setMessage({ type: 'success', text: '' });
    try {
      const { data } = await listClients({ search: texto, estado: 'activo', limit: 10 });
      setResults(data);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setBusy(false);
    }
  };

  const reserve = async (cliente) => {
    setBusy(true);
    setMessage({ type: 'success', text: '' });
    try {
      await createReservation({ id_clase: Number(idClase), fecha_sesion: fechaSesion, id_cliente: cliente.id_cliente });
      setMessage({ type: 'success', text: `Reserva registrada para ${cliente.nombre} ${cliente.apellido}.` });
      setResults(null);
      setSearch('');
      onReserved?.();
    } catch (error) {
      // Por ejemplo: "Clase llena." o "El cliente ya tiene una reserva en esta clase."
      setMessage({ type: 'error', text: error.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card reservation-form">
      <h2>Reservar un lugar</h2>
      <form className="form form-inline" onSubmit={handleSearch} noValidate>
        <div className="field">
          <label htmlFor="buscar-cliente">Buscar cliente</label>
          <input
            id="buscar-cliente"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nombre, apellido o correo"
          />
        </div>
        <button type="submit" className="btn btn-secondary" disabled={busy}>
          Buscar
        </button>
      </form>

      <Message type={message.type}>{message.text}</Message>

      {results &&
        (results.length === 0 ? (
          <p role="status">No se encontraron clientes activos con esa búsqueda.</p>
        ) : (
          <ul className="result-list">
            {results.map((cliente) => (
              <li key={cliente.id_cliente}>
                <span>
                  {cliente.nombre} {cliente.apellido}
                </span>
                <button
                  type="button"
                  className="btn"
                  disabled={busy}
                  aria-label={`Reservar a ${cliente.nombre} ${cliente.apellido}`}
                  onClick={() => reserve(cliente)}
                >
                  Reservar
                </button>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}
