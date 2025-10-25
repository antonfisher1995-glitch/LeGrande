const symbols = ["🍒", "🍋", "🍇", "🍉", "⭐", "💎"];
const reels = [
  document.getElementById("reel1"),
  document.getElementById("reel2"),
  document.getElementById("reel3")
];
const spinButton = document.getElementById("spinButton");
const result = document.getElementById("result");

function spinReel(reel) {
  return new Promise((resolve) => {
    let spins = 20 + Math.floor(Math.random() * 10);
    let count = 0;
    const interval = setInterval(() => {
      reel.textContent = symbols[Math.floor(Math.random() * symbols.length)];
      count++;
      if (count >= spins) {
        clearInterval(interval);
        resolve(reel.textContent);
      }
    }, 100);
  });
}

spinButton.addEventListener("click", async () => {
  result.textContent = "Spinning...";
  spinButton.disabled = true;

  const results = await Promise.all(reels.map(spinReel));
  const [a, b, c] = results;

  if (a === b && b === c) {
    result.textContent = "🎉 JACKPOT! You won! 🎉";
  } else if (a === b || b === c || a === c) {
    result.textContent = "😊 You got a pair!";
  } else {
    result.textContent = "😢 Try again!";
  }

  spinButton.disabled = false;
});
