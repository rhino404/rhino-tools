export function loadCryptoPrices() {
  const priceSpan = document.getElementById('crypto-prices');
  const API_URL = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=percent_change_24h_desc&per_page=5&page=1';

  let retryCount = 0;
  const maxRetries = 5;

  function fetchPrices(delay = 0) {
    if (delay > 0) {
      // Wait before retrying
      setTimeout(() => fetchPrices(0), delay);
      return;
    }

    fetch(API_URL)
      .then(res => {
        if (res.status === 429) {
          // Too many requests, retry with backoff
          if (retryCount < maxRetries) {
            retryCount++;
            const backoffDelay = 2 ** retryCount * 1000; // exponential backoff: 2s, 4s, 8s, ...
            priceSpan.textContent = `⚠️ Rate limited. Retrying in ${backoffDelay / 1000}s...`;
            fetchPrices(backoffDelay);
          } else {
            priceSpan.textContent = '⚠️ Too many requests. Please try again later.';
          }
          throw new Error('Rate limited');
        }
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then(data => {
        retryCount = 0; // reset retry counter on success

        if (!Array.isArray(data) || data.length === 0) {
          priceSpan.textContent = '⚠️ No data available';
          return;
        }

        const movers = data.map(coin => {
          const change = coin.price_change_percentage_24h?.toFixed(2);
          const isUp = coin.price_change_percentage_24h >= 0;
          const arrow = isUp ? '📈' : '📉';
          return `${coin.symbol.toUpperCase()}: $${coin.current_price}\n${arrow} ${change}%`;
        });

        let index = 0;
        priceSpan.textContent = movers[index];

        // Clear previous interval if any (to avoid multiple intervals piling up)
        if (priceSpan._intervalId) clearInterval(priceSpan._intervalId);

        priceSpan._intervalId = setInterval(() => {
          index = (index + 1) % movers.length;
          priceSpan.textContent = movers[index];
        }, 10000);
      })
      .catch(err => {
        if (err.message !== 'Rate limited') {
          priceSpan.textContent = '⚠️ Error loading top movers';
        }
        // On rate limit, the message is already handled above
      });
  }

  fetchPrices();
}
