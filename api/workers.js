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
    let targetUrlStr = currentUrl.searchParams.get("url");

    if (!targetUrlStr) {
      const pathAndSearch = currentUrl.pathname + currentUrl.search;
      if (pathAndSearch.startsWith("//?url=")) {
        targetUrlStr = decodeURIComponent(pathAndSearch.split("//?url=")[1]);
      } else if (currentUrl.searchParams.has("bypass")) {
        targetUrlStr = currentUrl.searchParams.get("bypass");
      } else {
        return new Response("Error: 'url' parameter is required.", { status: 400 });
      }
    }

    try {
      const targetUrl = new URL(targetUrlStr);
      const originDomain = targetUrl.origin;

      const modifiedHeaders = new Headers(request.headers);
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

        const relativeRegex = /(href|src|action)=["'](\/[^"']*)["']/g;
        text = text.replace(relativeRegex, (match, p1, p2) => {
          if (p2.startsWith("//")) {
            return `${p1}="${currentUrl.origin}/?url=https:${p2}"`;
          }
          return `${p1}="${currentUrl.origin}/?url=${originDomain}${p2}"`;
        });

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
