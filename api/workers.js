export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    const targetUrlString = url.searchParams.get("url");
    if (!targetUrlString) {
      return new Response("URL parameter is missing", { status: 400 });
    }

    try {
      const targetUrl = new URL(targetUrlString);
      
      const response = await fetch(targetUrl.href, {
        headers: request.headers
      });

      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("text/html")) {
        let html = await response.text();

        const baseUrl = targetUrl.origin;
        html = html.replace(/(src|href)=["']\/([^"']+)["']/g, `$1="${baseUrl}/$2"`);

        const newHeaders = new Headers(response.headers);
        newHeaders.delete("X-Frame-Options");
        newHeaders.delete("Content-Security-Policy");
        newHeaders.set("Access-Control-Allow-Origin", "*");

        return new Response(html, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders
        });
      }

      return response;

    } catch (e) {
      return new Response("Error fetching target URL", { status: 500 });
    }
  }
};
