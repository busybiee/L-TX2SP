document.getElementById("processBtn").addEventListener("click", processCSV);

function processCSV() {
  const fileInput = document.getElementById("csvInput");
  const resultDiv = document.getElementById("result");

  if (!fileInput.files.length) {
    alert("Please upload a CSV file.");
    return;
  }

  const file = fileInput.files[0];
  const reader = new FileReader();

  reader.onload = function (e) {
    const csvData = e.target.result;
    const rows = csvData.split("\n").slice(1); // Remove header row

    if (!rows.length) {
      resultDiv.innerHTML = "The CSV file is empty or invalid.";
      return;
    }

    const gameData = { numbers: [], bonus: [], gameName: "", latestDate: "" };
    let latestTimestamp = 0;

    rows.forEach((row) => {
      const cols = row.split(",");
      if (cols.length >= 9) {
        if (!gameData.gameName) {
          gameData.gameName = cols[0]; // Get game name
          document.getElementById("gameName").textContent = gameData.gameName;
        }

        // Parse the date columns
        const month = parseInt(cols[1], 10);
        const day = parseInt(cols[2], 10);
        const year = parseInt(cols[3], 10);
        const timestamp = new Date(year, month - 1, day).getTime();

        if (timestamp > latestTimestamp) {
          latestTimestamp = timestamp;
          gameData.latestDate = `${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}/${year}`;
        }

        // Collect numbers and bonus ball
        gameData.numbers.push(...cols.slice(4, 8).map(Number)); // Num1 to Num4
        gameData.bonus.push(Number(cols[8])); // Bonus Ball
      }
    });

    // Calculate probabilities
    const numProbabilities = calculateProbabilities(gameData.numbers, 35);
    const bonusProbabilities = calculateProbabilities(gameData.bonus, 35);

    // Get predictions
    const predictedNumbers = getMostFrequent(gameData.numbers, 4);
    const predictedBonus = getMostFrequent(gameData.bonus, 1);

    // Display predictions, latest date, and probabilities
    resultDiv.innerHTML = `
      <p style="color: red; font-size: 0.9rem;">Latest Drawing Date: ${gameData.latestDate}</p>
      <p style="color: black; font-size: 0.7rem;">Played: Mon & Thur 22:12 CST}</p>
      <p><strong>Predicted Numbers for the Next Drawing:</strong></p>
      <p>Numbers: ${predictedNumbers.join(", ")}</p>
      <p>Bonus Ball: ${predictedBonus.join(", ")}</p>

      <hr />

      <p><strong>Probability Distribution (Numbers 1-35):</strong></p>
      <p><u>Main Numbers:</u> ${formatProbabilities(numProbabilities)}</p>
      <p><u>Bonus Ball:</u> ${formatProbabilities(bonusProbabilities)}</p>
    `;
  };

  reader.onerror = function () {
    resultDiv.innerHTML = "There was an error reading the file.";
  };

  reader.readAsText(file);
}

// Calculate probabilities
function calculateProbabilities(arr, range) {
  const total = arr.length;
  const frequency = Array(range + 1).fill(0); // Initialize array for numbers 1 to range

  arr.forEach((num) => {
    if (num >= 1 && num <= range) {
      frequency[num]++;
    }
  });

  return frequency.map((count) => ((count / total) * 100).toFixed(2));
}

// Find the most frequent numbers
function getMostFrequent(arr, count) {
  const frequency = {};
  arr.forEach((num) => {
    frequency[num] = (frequency[num] || 0) + 1;
  });

  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1]) // Sort by frequency
    .slice(0, count) // Get top "count" numbers
    .map(([num]) => Number(num));
}

// Format probabilities as a comma-separated string
function formatProbabilities(probabilities) {
  return probabilities
    .map((prob, index) => `${index}: ${prob}%`)
    .filter((entry) => !entry.startsWith("0: 0.00%")) // Skip numbers with 0% probability
    .join("; ");
}
