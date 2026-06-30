export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
          "Access-Control-Allow-Headers": "*",
        },
      });
    }

    const currentUrl = new URL(request.url);
    const targetUrlStr = currentUrl.searchParams.get("url");

    if (!targetUrlStr) {
      return new Response("Error: 'url' parameter is required.", { status: 400 });
    }

    try {
      const targetUrl = new URL(targetUrlStr);
      const originDomain = targetUrl.origin;

      const modifiedHeaders = new Headers(request.headers);
      modifiedHeaders.set("User-Agent", "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1");
      modifiedHeaders.set("Referer", originDomain);
      modifiedHeaders.set("Origin", originDomain);

      const response = await fetch(targetUrl.toString(), {
        method: request.method,
        headers: modifiedHeaders,
        body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined
      });

      const contentType = response.headers.get("Content-Type") || "";

      if (contentType.includes("text/html") || contentType.includes("application/javascript") || contentType.includes("application/json") || contentType.includes("text/javascript")) {
        let text = await response.text();

        const escapedOrigin = originDomain.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const originRegex = new RegExp(escapedOrigin, 'g');
        text = text.replace(originRegex, `${currentUrl.origin}/?url=${originDomain}`);

        if (contentType.includes("text/html")) {
          const baseTag = `<base href="${originDomain}/">`;
          if (text.includes("<head>")) {
            text = text.replace("<head>", `<head>${baseTag}`);
          } else if (text.includes("<HEAD>")) {
            text = text.replace("<HEAD>", `<HEAD>${baseTag}`);
          } else {
            text = baseTag + text;
          }
        }

        return new Response(text, {
          headers: {
            "Content-Type": contentType,
            "Access-Control-Allow-Origin": "*",
          },
        });
      }

      const newResponse = new Response(response.body, response);
      newResponse.headers.set("Access-Control-Allow-Origin", "*");
      return newResponse;

    } catch (e) {
      return new Response(`Error fetching the URL: ${e.message}`, { status: 500 });
    }
  },
};
