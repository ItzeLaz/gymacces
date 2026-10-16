import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  bookingWindow,
  endsSameDay,
  isInBookingWindow,
  isoWeekday,
  overlaps,
  sessionDates,
  sessionState,
  toHHMM,
  toMinutes,
} from '../src/utils/sessions.js';

describe('utilidades de sesiones de clases', () => {
  it('se_empalman_intervalos_que_se_cruzan', () => {
    // 07:00–07:45 contra 07:30–08:30
    assert.equal(overlaps(420, 465, 450, 510), true);
    // Uno dentro del otro
    assert.equal(overlaps(420, 540, 450, 480), true);
    // Mismo horario
    assert.equal(overlaps(420, 465, 420, 465), true);
  });

  it('no_se_empalman_clases_contiguas', () => {
    // 08:00–09:00 y 09:00–10:00: los intervalos son semiabiertos
    assert.equal(overlaps(480, 540, 540, 600), false);
    assert.equal(overlaps(540, 600, 480, 540), false);
    assert.equal(overlaps(420, 465, 600, 660), false);
  });

  it('estado_de_sesion_pendiente_en_curso_y_terminada', () => {
    const sesion = ['2026-10-19', 420, 465];
    assert.equal(sessionState(...sesion, { fecha: '2026-10-18', minutos: 1000 }), 'pendiente', 'un día antes');
    assert.equal(sessionState(...sesion, { fecha: '2026-10-19', minutos: 419 }), 'pendiente', 'un minuto antes');
    assert.equal(sessionState(...sesion, { fecha: '2026-10-19', minutos: 420 }), 'en_curso', 'a la hora de inicio');
    assert.equal(sessionState(...sesion, { fecha: '2026-10-19', minutos: 464 }), 'en_curso', 'un minuto antes del fin');
    assert.equal(sessionState(...sesion, { fecha: '2026-10-19', minutos: 465 }), 'terminada', 'a la hora de fin');
    assert.equal(sessionState(...sesion, { fecha: '2026-10-20', minutos: 0 }), 'terminada', 'al día siguiente');
  });

  it('la_ventana_de_reserva_incluye_hoy_y_hoy_mas_siete', () => {
    assert.deepEqual(bookingWindow('2026-10-16'), { desde: '2026-10-16', hasta: '2026-10-23' });
    assert.equal(isInBookingWindow('2026-10-16', '2026-10-16'), true, 'hoy');
    assert.equal(isInBookingWindow('2026-10-23', '2026-10-16'), true, 'hoy + 7');
    assert.equal(isInBookingWindow('2026-10-20', '2026-10-16'), true, 'dentro de la ventana');
  });

  it('rechaza_ayer_y_hoy_mas_ocho', () => {
    assert.equal(isInBookingWindow('2026-10-15', '2026-10-16'), false, 'ayer');
    assert.equal(isInBookingWindow('2026-10-24', '2026-10-16'), false, 'hoy + 8');
    // La ventana cruza el fin de mes
    assert.equal(isInBookingWindow('2026-11-02', '2026-10-28'), true, 'cruza de octubre a noviembre');
  });

  it('fechas_de_sesion_de_una_clase_por_dia_iso', () => {
    assert.equal(isoWeekday('2026-10-19'), 1, '2026-10-19 es lunes');
    assert.equal(isoWeekday('2026-10-25'), 7, '2026-10-25 es domingo');
    assert.equal(isoWeekday('2026-10-16'), 5, '2026-10-16 es viernes');
    // Ventana de viernes a viernes: el lunes aparece una vez y el viernes dos
    assert.deepEqual(sessionDates(1, '2026-10-16', '2026-10-23'), ['2026-10-19']);
    assert.deepEqual(sessionDates(5, '2026-10-16', '2026-10-23'), ['2026-10-16', '2026-10-23']);
    assert.deepEqual(sessionDates(7, '2026-10-16', '2026-10-23'), ['2026-10-18']);
  });

  it('termina_el_mismo_dia', () => {
    assert.equal(endsSameDay(toMinutes('23:00'), 60), true, '23:00 + 60 termina a las 24:00');
    assert.equal(endsSameDay(toMinutes('23:30'), 45), false, '23:30 + 45 cruza la medianoche');
    assert.equal(endsSameDay(toMinutes('07:00'), 240), true);
  });

  it('convierte_hhmm_a_minutos_y_de_regreso', () => {
    assert.equal(toMinutes('00:00'), 0);
    assert.equal(toMinutes('07:05'), 425);
    assert.equal(toMinutes('23:59'), 1439);
    // MySQL devuelve TIME con segundos
    assert.equal(toMinutes('07:45:00'), 465);
    assert.equal(toHHMM(425), '07:05');
    assert.equal(toHHMM(1440), '24:00');
    assert.equal(toHHMM(toMinutes('18:30')), '18:30');
  });
});
