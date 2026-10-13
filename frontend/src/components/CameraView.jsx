import { useEffect, useRef, useState } from 'react';

// Abre la cámara y muestra el video; se apaga al salir de la pantalla (research R-04)
export default function CameraView({ onReady, onError, className = 'camera-view' }) {
  const videoRef = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let stream = null;
    let cancelled = false;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw Object.assign(new Error('Este navegador no permite usar la cámara.'), { known: true });
      }
      stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false });
      if (cancelled) return;
      const video = videoRef.current;
      video.srcObject = stream;
      await video.play();
      onReady?.(video);
    }

    start().catch((err) => {
      if (cancelled) return;
      let message = 'No se pudo abrir la cámara. Revisa que esté conectada.';
      if (err.known) message = err.message;
      else if (err.name === 'NotAllowedError') message = 'El navegador no tiene permiso para usar la cámara.';
      else if (err.name === 'NotFoundError') message = 'No se encontró ninguna cámara conectada.';
      setError(message);
      onError?.(message);
    });

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
    // Se abre una sola vez al montar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={className}>
      <video ref={videoRef} muted playsInline aria-label="Vista de la cámara" />
      {error && (
        <p className="message message-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
