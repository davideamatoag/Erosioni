/**
 * Proxy OAuth per Decap CMS su GitHub Pages.
 *
 * GitHub Pages non può eseguire codice lato server, quindi il login del
 * pannello di amministrazione (che deve scambiare un "code" con un vero
 * token di accesso a GitHub) ha bisogno di un piccolo servizio esterno.
 * Questo file è pensato per essere incollato in un Cloudflare Worker
 * (gratuito). Istruzioni complete nel README del progetto.
 *
 * Richiede due variabili segrete impostate nel Worker:
 *   GITHUB_CLIENT_ID
 *   GITHUB_CLIENT_SECRET
 * (le ottieni creando una GitHub OAuth App — vedi README).
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/auth") {
      const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
      authorizeUrl.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
      authorizeUrl.searchParams.set("redirect_uri", `${url.origin}/callback`);
      authorizeUrl.searchParams.set("scope", "repo,user");
      return Response.redirect(authorizeUrl.toString(), 302);
    }

    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");

      if (!code) {
        return new Response("Codice di autorizzazione mancante.", { status: 400 });
      }

      const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.error || !tokenData.access_token) {
        return new Response(renderPopupScript("error", tokenData), {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }

      return new Response(
        renderPopupScript("success", { token: tokenData.access_token, provider: "github" }),
        { headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    return new Response("Proxy OAuth di Erosioni attivo.", { status: 200 });
  },
};

function renderPopupScript(status, data) {
  const message = `authorization:github:${status}:${JSON.stringify(data)}`;
  return `<!doctype html>
<html>
<body>
<script>
  (function () {
    function receiveMessage(e) {
      window.opener.postMessage('${message}', e.origin);
      window.removeEventListener('message', receiveMessage, false);
    }
    window.addEventListener('message', receiveMessage, false);
    window.opener.postMessage('authorizing:github', '*');
  })();
</script>
</body>
</html>`;
}
