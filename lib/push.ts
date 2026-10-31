import "server-only";

// Substituído no bloco de Web Push. Até lá não envia nada.
export async function notificarAdmins(
  _titulo: string,
  _corpo: string,
  _url = "/admin",
) {}
