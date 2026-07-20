/**
 * login.js
 * Envía la contraseña a /api/admin/login. Si es correcta, el backend
 * setea una cookie de sesión y redirigimos al dashboard.
 */
(function () {
  const form = document.getElementById('formLogin');
  const campoPassword = document.getElementById('campoPassword');
  const errorLogin = document.getElementById('errorLogin');
  const botonLogin = document.getElementById('botonLogin');

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    errorLogin.classList.remove('visible');
    botonLogin.disabled = true;
    botonLogin.textContent = 'Verificando…';

    try {
      const respuesta = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: campoPassword.value }),
      });
      const datos = await respuesta.json();

      if (!respuesta.ok) {
        errorLogin.textContent = datos.error || 'No se pudo iniciar sesión.';
        errorLogin.classList.add('visible');
        botonLogin.disabled = false;
        botonLogin.textContent = 'Ingresar';
        return;
      }

      window.location.href = '/admin/dashboard';
    } catch (error) {
      errorLogin.textContent = 'No se pudo conectar con el servidor.';
      errorLogin.classList.add('visible');
      botonLogin.disabled = false;
      botonLogin.textContent = 'Ingresar';
    }
  });
})();
