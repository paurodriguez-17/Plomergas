document.getElementById("btnRegistro").addEventListener("click", async () => {
  const nombre = document.getElementById("nombre").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!nombre || !email || !password) {
    return alert("Completá todos los campos.");
  }

  const res = await fetch("/api/auth/registrar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre, email, password })
  });

  const data = await res.json();

  if (!res.ok) return alert(data.error);

  alert("Registro enviado. Tu cuenta debe ser aprobada por el administrador.");

  window.location.href = "/login";
});
