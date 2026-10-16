import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, endDateFor, isValidDate, nowInGym, today, daysBetween } from '../src/utils/dates.js';
import { compareAmounts, fromCents, isValidAmount, toCents } from '../src/utils/money.js';

describe('utilidades de fechas', () => {
  it('today_devuelve_la_fecha_en_la_zona_del_gimnasio', () => {
    // 2026-10-13 04:30 UTC todavía es 12 de octubre en Ciudad de México
    assert.equal(today(new Date('2026-10-13T04:30:00Z')), '2026-10-12');
    assert.match(today(), /^\d{4}-\d{2}-\d{2}$/);
  });

  it('add_days_cruza_fin_de_mes_y_de_anio', () => {
    assert.equal(addDays('2026-01-31', 1), '2026-02-01');
    assert.equal(addDays('2026-12-31', 1), '2027-01-01');
    assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  });

  it('end_date_for_incluye_el_dia_de_inicio', () => {
    assert.equal(endDateFor('2026-10-01', 30), '2026-10-30');
    assert.equal(endDateFor('2026-10-12', 1), '2026-10-12');
  });

  it('is_valid_date_rechaza_fechas_imposibles', () => {
    assert.equal(isValidDate('2026-02-29'), false, '2026 no es bisiesto');
    assert.equal(isValidDate('2028-02-29'), true);
    assert.equal(isValidDate('12/10/2026'), false);
  });

  it('now_in_gym_devuelve_fecha_y_minutos_locales', () => {
    // 13:05 UTC son las 07:05 en Ciudad de México (UTC-6)
    assert.deepEqual(nowInGym(new Date('2026-10-19T13:05:00Z')), { fecha: '2026-10-19', minutos: 425 });
    assert.deepEqual(nowInGym(new Date('2026-10-19T06:00:00Z')), { fecha: '2026-10-19', minutos: 0 });
  });

  it('now_in_gym_cambia_de_dia_segun_la_zona_del_gimnasio', () => {
    // 05:30 UTC del día 20 todavía son las 23:30 del día 19 en el gimnasio
    assert.deepEqual(nowInGym(new Date('2026-10-20T05:30:00Z')), { fecha: '2026-10-19', minutos: 1410 });
    const ahora = nowInGym();
    assert.match(ahora.fecha, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(ahora.minutos >= 0 && ahora.minutos < 1440, 'los minutos deben estar dentro del día');
  });

  it('days_between_cuenta_dias_completos', () => {
    assert.equal(daysBetween('2026-10-01', '2026-10-31'), 30);
  });
});

describe('utilidades de montos', () => {
  it('suma_en_centavos_sin_errores_de_redondeo', () => {
    assert.equal(fromCents(toCents('0.10') + toCents('0.20')), '0.30');
    assert.equal(toCents('450.5'), 45050);
    assert.equal(fromCents(45050), '450.50');
  });

  it('rechaza_montos_con_mas_de_dos_decimales', () => {
    assert.equal(isValidAmount('10.123'), false);
    assert.equal(isValidAmount('-5'), false);
    assert.throws(() => toCents('10.123'));
  });

  it('compara_montos_correctamente', () => {
    assert.ok(compareAmounts('300.00', '250.00') > 0);
    assert.equal(compareAmounts('250', '250.00'), 0);
  });
});
