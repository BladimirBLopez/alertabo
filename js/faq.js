cat > js/faq.js << 'EOF'
/**
 * faq.js
 * Acordeón simple y accesible para la sección de preguntas frecuentes.
 */
(function () {
  const items = document.querySelectorAll('.faq-item');

  items.forEach((item) => {
    const pregunta = item.querySelector('.faq-item__pregunta');
    const respuesta = item.querySelector('.faq-item__respuesta');

    pregunta.addEventListener('click', () => {
      const estaAbierto = item.getAttribute('data-abierto') === 'true';

      items.forEach((otro) => {
        otro.setAttribute('data-abierto', 'false');
        otro.querySelector('.faq-item__respuesta').style.maxHeight = null;
      });

      if (!estaAbierto) {
        item.setAttribute('data-abierto', 'true');
        respuesta.style.maxHeight = respuesta.scrollHeight + 'px';
      }
    });
  });
})();
EOF