const RATE_LIMIT_DELAY = 1200;
const REQUEST_TIMEOUT = 10000;

export async function rateLimitedFetch(url, { retries = 1, timeout = REQUEST_TIMEOUT } = {}) {
  for (let i = 0; i <= retries; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      const data = await res.json();
      if (data.errors?.rateLimit) {
        return { response: [], errors: { rateLimit: true } };
      }
      if (data.errors?.plan) {
        return { response: [], errors: { plan: data.errors.plan } };
      }
      return data;
    } catch (e) {
      clearTimeout(timer);
      if (e.name === 'AbortError') {
        return { response: [], errors: { timeout: true } };
      }
      if (i === retries) return { response: [] };
      await new Promise(r => setTimeout(r, RATE_LIMIT_DELAY));
    }
  }
}
