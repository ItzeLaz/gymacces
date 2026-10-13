import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { decryptSamples, encryptSamples } from '../src/utils/faceCrypto.js';
import { sampleSet } from './helpers/factories.js';

describe('cifrado de la información facial', () => {
  const muestras = sampleSet(1);

  it('cifrar_y_descifrar_devuelve_las_mismas_muestras', () => {
    const cifrado = encryptSamples(muestras);
    assert.deepEqual(decryptSamples(cifrado), muestras);
  });

  it('cada_cifrado_usa_un_iv_distinto', () => {
    const a = encryptSamples(muestras);
    const b = encryptSamples(muestras);
    assert.equal(a.iv.length, 12);
    assert.equal(a.auth_tag.length, 16);
    assert.notDeepEqual(a.iv, b.iv, 'dos cifrados no deben compartir el vector de inicialización');
    assert.notDeepEqual(a.descriptor_cifrado, b.descriptor_cifrado);
  });

  it('el_texto_cifrado_no_contiene_las_muestras_legibles', () => {
    const { descriptor_cifrado: cifrado } = encryptSamples(muestras);
    assert.equal(cifrado.includes(Buffer.from('muestras')), false);
    assert.equal(cifrado.includes(Buffer.from(String(muestras[0][0]))), false);
  });

  it('detecta_cualquier_alteracion_del_cifrado_iv_o_etiqueta', () => {
    const original = encryptSamples(muestras);
    for (const campo of ['descriptor_cifrado', 'iv', 'auth_tag']) {
      const alterado = { ...original, [campo]: Buffer.from(original[campo]) };
      alterado[campo][0] ^= 0xff;
      assert.throws(() => decryptSamples(alterado), `alterar ${campo} debe impedir el descifrado`);
    }
  });

  it('no_se_puede_descifrar_con_otra_llave', () => {
    const cifrado = encryptSamples(muestras);
    assert.throws(() => decryptSamples(cifrado, crypto.randomBytes(32)));
  });
});
