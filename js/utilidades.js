cat > js/utilidades.js << 'EOF'
/**
 * utilidades.js
 * Funciones compartidas por todo el frontend de AlertaBo.
 */

const AlertaBoUtils = (function () {

  function normalizarWhatsapp(valorCrudo) {
    if (!valorCrudo) return null;
    let solonumeros = valorCrudo.replace(/[^\d]/g, '');

    if (solonumeros.startsWith('591') && solonumeros.length === 11) {
      solonumeros = solonumeros.slice(3);
    }

    const esValido = /^[67]\d{7}$/.test(solonumeros);
    if (!esValido) return null;

    return `+591${solonumeros}`;
  }

  function normalizarFacebookUrl(valorCrudo) {
    if (!valorCrudo) return null;
    let url = valorCrudo.trim();

    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }

    try {
      const urlObj = new URL(url);
      const dominioValido = /(^|\.)facebook\.com$|(^|\.)fb\.com$/i.test(urlObj.hostname);
      if (!dominioValido) return null;
      return urlObj.origin + urlObj.pathname.replace(/\/+$/, '');
    } catch {
      return null;
    }
  }

  function sanitizarTexto(texto) {
    if (typeof texto !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
  }

  function formatearFecha(fechaIso) {
    if (!fechaIso) return '—';
    const fecha = new Date(fechaIso);
    return fecha.toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function formatearWhatsappVisible(numero) {
    if (!numero) return '';
    const match = numero.match(/^\+591(\d{3})(\d{2})(\d{3})$/);
    if (!match) return numero;
    return `+591 ${match[1]} ${match[2]} ${match[3]}`;
  }

  function debounce(fn, esperaMs = 300) {
    let temporizador;
    return (...args) => {
      clearTimeout(temporizador);
      temporizador = setTimeout(() => fn(...args), esperaMs);
    };
  }

  const ETIQUETAS_RIESGO = {
    sin_reportes: { texto: 'Sin reportes', clase: 'chip-riesgo--sin-reportes' },
    con_reportes: { texto: 'Con reportes', clase: 'chip-riesgo--con-reportes' },
    multiples_reportes: { texto: 'Múltiples reportes', clase: 'chip-riesgo--multiples-reportes' },
  };

  return {
    normalizarWhatsapp,
    normalizarFacebookUrl,
    sanitizarTexto,
    formatearFecha,
    formatearWhatsappVisible,
    debounce,
    ETIQUETAS_RIESGO,
  };
})();
EOF