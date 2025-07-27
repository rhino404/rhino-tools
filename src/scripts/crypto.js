export function loadCryptoPrices() {
  fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,ripple&vs_currencies=usd')
    .then(res => res.json())
    .then(data => {
      const priceSpan = document.getElementById('crypto-prices');

      const prices = [
        `BTC: $${data.bitcoin.usd}`,
        `ETH: $${data.ethereum.usd}`,
        `SOL: $${data.solana.usd}`,
        `XRP: $${data.ripple.usd}`
      ];

      let index = 0;
      priceSpan.textContent = prices[index];

      setInterval(() => {
        index = (index + 1) % prices.length;
        priceSpan.textContent = prices[index];
      }, 10000); // change every 10 seconds
    })
    .catch(() => {
      const priceSpan = document.getElementById('crypto-prices');
      priceSpan.textContent = '⚠️ Error loading crypto prices';
    });
}
