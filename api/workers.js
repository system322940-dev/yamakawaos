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

    const url = new URL(request.url);
    const targetUrlStr = url.searchParams.get("url");

    if (!targetUrlStr) {
      return new Response("Error: 'url' parameter is required.", { status: 400 });
    }

    try {
      const targetUrl = new URL(targetUrlStr);
      const baseDomain = targetUrl.origin;

      const modifiedHeaders = new Headers(request.headers);
      modifiedHeaders.set("Referer", baseDomain);
      modifiedHeaders.set("Origin", baseDomain);

      const response = await fetch(targetUrl.toString(), {
        method: request.method,
        headers: modifiedHeaders,
        body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined
      });

      const contentType = response.headers.get("Content-Type") || "";

      if (contentType.includes("text/html")) {
        let htmlText = await response.text();
        const baseTag = `<base href="${baseDomain}/">`;
        
        if (htmlText.includes("<head>")) {
          htmlText = htmlText.replace("<head>", `<head>${baseTag}`);
        } else if (htmlText.includes("<HEAD>")) {
          htmlText = htmlText.replace("<HEAD>", `<HEAD>${baseTag}`);
        } else {
          htmlText = baseTag + htmlText;
        }

        return new Response(htmlText, {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
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
