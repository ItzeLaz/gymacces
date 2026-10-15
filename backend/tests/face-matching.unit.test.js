import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  bestMatch,
  bestSimilarity,
  cosineSimilarity,
  FACE_DESCRIPTOR_LENGTH,
  isValidDescriptor,
} from '../src/utils/faceMatching.js';
import { nearDescriptor, sampleSet, syntheticDescriptor } from './helpers/factories.js';

const OPTIONS = { threshold: 0.6, margin: 0.05 };

describe('comparación de descriptores faciales', () => {
  it('la_similitud_de_un_vector_consigo_mismo_es_uno', () => {
    const vector = syntheticDescriptor(5);
    assert.ok(Math.abs(cosineSimilarity(vector, vector) - 1) < 1e-9);
  });

  it('rostros_distintos_tienen_similitud_baja_y_el_mismo_rostro_alta', () => {
    const a = syntheticDescriptor(10);
    assert.ok(cosineSimilarity(a, syntheticDescriptor(11)) < 0.2, 'dos personas distintas no deben parecerse');
    assert.ok(cosineSimilarity(a, nearDescriptor(a)) > 0.9, 'dos capturas de la misma persona deben parecerse');
  });

  it('identifica_al_cliente_que_supera_umbral_y_margen', () => {
    const candidatos = [
      { id_cliente: 1, muestras: sampleSet(100) },
      { id_cliente: 2, muestras: sampleSet(200) },
    ];
    const captura = nearDescriptor(syntheticDescriptor(200), 0.3, 7);
    const resultado = bestMatch(captura, candidatos, OPTIONS);
    assert.equal(resultado.id_cliente, 2);
    assert.ok(resultado.similitud >= 0.6);
  });

  it('no_identifica_cuando_nadie_alcanza_el_umbral', () => {
    const candidatos = [{ id_cliente: 1, muestras: sampleSet(100) }];
    assert.equal(bestMatch(syntheticDescriptor(999), candidatos, OPTIONS), null);
  });

  it('no_identifica_cuando_dos_clientes_quedan_dentro_del_margen', () => {
    const base = syntheticDescriptor(300);
    const candidatos = [
      { id_cliente: 1, muestras: [nearDescriptor(base, 0.1, 1)] },
      { id_cliente: 2, muestras: [nearDescriptor(base, 0.1, 2)] },
    ];
    assert.equal(bestMatch(nearDescriptor(base, 0.2, 3), candidatos, OPTIONS), null, 'el caso ambiguo se rechaza');
  });

  it('toma_la_mejor_de_las_muestras_de_cada_cliente', () => {
    const base = syntheticDescriptor(400);
    const muestras = [syntheticDescriptor(401), nearDescriptor(base, 0.1, 2), syntheticDescriptor(402)];
    assert.ok(bestSimilarity(base, muestras) > 0.9);
  });

  it('valida_longitud_y_numeros_finitos', () => {
    assert.equal(isValidDescriptor(syntheticDescriptor(1)), true);
    assert.equal(isValidDescriptor(new Array(FACE_DESCRIPTOR_LENGTH - 1).fill(0.1)), false);
    const conNaN = syntheticDescriptor(1);
    conNaN[3] = NaN;
    assert.equal(isValidDescriptor(conNaN), false);
    const conInfinito = syntheticDescriptor(1);
    conInfinito[3] = Infinity;
    assert.equal(isValidDescriptor(conInfinito), false);
    assert.equal(isValidDescriptor('0.1,0.2'), false);
  });
});
