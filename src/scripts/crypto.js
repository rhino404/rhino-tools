export function loadCryptoPrices() {
  fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,ripple&vs_currencies=usd')
    .then(res => res.json())
    .then(data => {
      const bar = document.getElementById('crypto-bar');
      bar.textContent = `BTC: $${data.bitcoin.usd} | ETH: $${data.ethereum.usd} | SOL: $${data.solana.usd} | XRP: $${data.ripple.usd}`;
    })
    .catch(() => {
      document.getElementById('crypto-bar').textContent = '⚠️ Error loading crypto prices';
    });
}

// // Call once on load and then every 2 minutes
// loadCryptoPrices();
// setInterval(loadCryptoPrices, 120000);