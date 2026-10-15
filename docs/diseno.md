Reorganiza la estructura de navegación y rediseña la interfaz de la aplicación frontend (archivos styles.css, App.jsx, componentes de navegación y vistas) para que deje de mostrar todos los módulos agrupados en una sola página y adopte un diseño modular moderno Dark Fitness Luxury con menú superior flotante.

Sigue detenidamente estas especificaciones de UI/UX y arquitectura:

1. ARQUITECTURA DE NAVEGACIÓN Y RUTAS:
   - Crea un nuevo componente de navegación superior frontend/src/components/Navbar.jsx.
   - Modifica App.jsx para que cada módulo tenga su propia ruta independiente y limpia:
     * /dashboard -> Resumen operativo, estadísticas e indicadores clave (KPIs).
     * /users -> Gestión de usuarios y roles.
     * /clients -> Registro y consulta de clientes.
     * /memberships -> Tipos de membresías, asignación y renovación.
     * /payments -> Registro e historial de pagos.
     * /access -> Reconocimiento facial y control de acceso.
     * /training -> Gestión de entrenadores, asignaciones y rutinas.
   - El Navbar.jsx debe mostrarse fijo en la parte superior únicamente cuando el usuario esté autenticado.

2. DISEÑO DEL NAVBAR (Menú flotante en Cápsula / Pill Header):
   - Posición: position: fixed; top: 1.5rem; left: 50%; transform: translateX(-50%); z-index: 1000; width: 90%; max-width: 1100px;.
   - Estilo: background: rgba(22, 24, 30, 0.75); backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 9999px; padding: 0.75rem 1.75rem; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 10px 30px rgba(0,0,0,0.5);.
   - Izquierda: Branding/Logo del gimnasio en texto grueso con icono deportivo.
   - Centro: Enlaces de navegación (Dashboard, Clientes, Membresías, Pagos, Acceso, Entrenamiento) con esquinas redondeadas (border-radius: 9999px). El enlace activo debe resaltar con fondo naranja o blanco brillante.
   - Derecha: Botón de "Cerrar Sesión" en estilo botón redondeado color naranja deportivo.

3. SISTEMA DE DISEÑO VISUAL (Dark Fitness & Warm Orange Accent):
   - Colores base (Variables CSS en :root):
     * --bg-dark: #0a0b0e (Negro antracita profundo).
     * --bg-card: rgba(255, 255, 255, 0.03) con backdrop-filter: blur(12px).
     * --accent-orange: #f05a24 (Naranja vibrante de alto contraste).
     * --accent-orange-glow: rgba(240, 90, 36, 0.35).
     * --text-primary: #ffffff.
     * --text-secondary: #9ca3af (Gris suave para subtítulos y etiquetas).
     * --border-light: rgba(255, 255, 255, 0.08).
   - Fondo de pantalla: Agrega un degradado radial sutil en el fondo general para simular iluminación cálida en la parte superior:
     background: radial-gradient(circle at 50% 0%, rgba(240, 90, 36, 0.12) 0%, #0a0b0e 65%); background-attachment: fixed;
   - Tarjetas, Tablas y Paneles:
     * border-radius: 20px; border: 1px solid var(--border-light); background: var(--bg-card); padding: 1.5rem;
     * Efecto hover en tarjetas e interactivos: transition: all 0.3s ease; transform: translateY(-3px); box-shadow: 0 12px 25px rgba(0,0,0,0.4);
   - Botones Primarios:
     * background: var(--accent-orange); color: #fff; font-weight: 600; border-radius: 9999px; padding: 0.65rem 1.5rem; border: none; box-shadow: 0 4px 15px var(--accent-orange-glow); cursor: pointer; transition: all 0.2s ease;

4. TIPOGRAFÍA Y ESPACIADO:
   - Importa la fuente @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap'); en styles.css.
   - Ajusta el contenedor principal (main-content) con un margin-top: 110px para que el Navbar flotante no empape ni cubra los títulos de cada página.

Ejecuta la refactorización en los archivos de React y CSS, y verifica que el proyecto compile sin errores.