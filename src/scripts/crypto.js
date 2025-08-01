export function loadCryptoPrices() {
  fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=percent_change_24h_desc&per_page=5&page=1')
    .then(res => res.json())
    .then(data => {
      const priceSpan = document.getElementById('crypto-prices');

      const movers = data.map(coin => {
        const change = coin.price_change_percentage_24h?.toFixed(2);
        const isUp = coin.price_change_percentage_24h >= 0;
        const arrow = isUp ? '📈' : '📉';
        return `${coin.symbol.toUpperCase()}: $${coin.current_price}\n${arrow} ${change}%`;
      });

      let index = 0;
      priceSpan.textContent = movers[index];

      setInterval(() => {
        index = (index + 1) % movers.length;
        priceSpan.textContent = movers[index];
      }, 10000);
    })
    .catch(() => {
      const priceSpan = document.getElementById('crypto-prices');
      priceSpan.textContent = '⚠️ Error loading top movers';
    });
}
