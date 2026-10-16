Rediseña el componente de inicio de sesión (frontend/src/pages/LoginPage.jsx o equivalente) y sus estilos en styles.css para implementar una maquetación en pantalla dividida (Split-Screen Layout 50/50) con una estética Dark Fitness & Warm Orange Accent elegante, minimalista y libre de saturación visual:

1. Arquitectura de Pantalla Dividida (Split-Screen Layout)
Contenedor principal de alto completo (min-height: 100vh; display: flex; overflow: hidden; background: #0a0b0e;).

Lado Izquierdo (.login-hero-section): Ocupa el 50% del ancho (flex: 1;), con un layout vertical flexbox (display: flex; flex-direction: column; justify-content: space-between; padding: 4rem 3.5rem;).

Lado Derecho (.login-form-section): Ocupa el 50% del ancho (flex: 1;), centrando vertical y horizontalmente el formulario de autenticación sobre un fondo oscuro sólido o sutilmente diferenciado (#0f1117).

2. Lado Izquierdo: Hero Section Minimalista & Showcase
Mantén la estructura visual sumamente limpia evitando saturación de párrafos o descripciones sobrantes:

Superior: Branding con logo e icono del gimnasio ("GYM ACCESS" / "ACCESS GYM") en tipografía negrita.

Centro (Hero + Card):

Título principal en tipografía sans-serif limpia (ej. Plus Jakarta Sans): "Controla quién entra, sin filas." donde la frase "sin filas." resalta en color Naranja Deportivo (#f05a24).

Tarjeta Showcase Glassmorphism flotante compacta (background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 20px; padding: 1.5rem;):

Incluye una vista gráfica limpia del módulo de reconocimiento facial (icono/marco de escaneo facial).

Un indicador o badge verde/naranja brillante con el estado "Acceso autorizado".

Inferior: Puntos de navegación/indicadores (dots) del carrusel con el indicador activo resaltado en naranja acento.

3. Lado Derecho: Formulario Enfocado y Elegante
Título claro: "Iniciar sesión en Access Gym" en blanco con subtítulo gris tenue.

Inputs de Correo electrónico y Contraseña estilizados con fondos oscuros traslúcidos, bordes suaves y selector de visibilidad (mostrar/ocultar contraseña).

Botón primario de ancho completo (width: 100%) con esquinas muy redondeadas (border-radius: 9999px o 14px), color naranja de acento (#f05a24), sombra brillante tenue (box-shadow: 0 4px 15px rgba(240, 90, 36, 0.3)) y flecha de acción (Iniciar sesión →).

Enlace secundario en la parte inferior para soporte o contacto.

4. Adaptabilidad Responsiva
En pantallas móviles o pequeñas (@media (max-width: 768px)), oculta el panel izquierdo (.login-hero-section { display: none; }) y deja el formulario centrado en pantalla completa.

Aplica los cambios asegurando que las funciones de autenticación y lógica con el backend sigan operando correctamente.