/**
 * tema.js
 * Alterna entre modo claro/oscuro y persiste la preferencia del usuario.
 * Por defecto, AlertaBo usa modo claro.
 */
(function () {
  const CLAVE_ALMACENAMIENTO = 'alertabo_tema';
  const raiz = document.documentElement;
  const boton = document.getElementById('toggleTema');

  function obtenerTemaGuardado() {
    return localStorage.getItem(CLAVE_ALMACENAMIENTO);
  }

  function aplicarTema(tema) {
    raiz.setAttribute('data-theme', tema);
    localStorage.setItem(CLAVE_ALMACENAMIENTO, tema);
    actualizarIconoBoton(tema);
  }

  function actualizarIconoBoton(tema) {
    if (!boton) return;
    const icono = boton.querySelector('i');
    if (!icono) return;
    icono.setAttribute('data-lucide', tema === 'dark' ? 'sun' : 'moon');
    if (window.lucide) window.lucide.createIcons();
  }

  const temaInicial = obtenerTemaGuardado() || 'light';
  aplicarTema(temaInicial);

  if (boton) {
    boton.addEventListener('click', () => {
      const temaActual = raiz.getAttribute('data-theme');
      aplicarTema(temaActual === 'dark' ? 'light' : 'dark');
    });
  }
})();
