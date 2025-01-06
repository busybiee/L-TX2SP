const CLIENT_ID = '<YOUR_CLIENT_ID>';
const API_KEY = '<YOUR_API_KEY>';
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

// Event listeners for buttons
document.getElementById("authorizeBtn").addEventListener("click", handleAuthClick);
document.getElementById("localFileBtn").addEventListener("click", () => {
  document.getElementById("csvInput").click();
});
document.getElementById("csvInput").addEventListener("change", processLocalCSV);

// Load the Google API client library
gapi.load('client:auth2', initClient);

function initClient() {
  gapi.client.init({
    apiKey: API_KEY,
    clientId: CLIENT_ID,
    discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
    scope: SCOPES,
  }).then(() => {
    console.log('Google API client initialized');
  });
}

// Handle Google Drive authentication
function handleAuthClick() {
  gapi.auth2.getAuthInstance().signIn().then(() => {
    listDriveFiles();
  });
}

// List CSV files from Google Drive
function listDriveFiles() {
  gapi.client.drive.files.list({
    pageSize: 10,
    fields: 'files(id, name)',
    q: "mimeType='text/csv'",
  }).then(response => {
    const files = response.result.files;
    if (files && files.length > 0) {
      const fileOptions = files.map(file => `<option value="${file.id}">${file.name}</option>`).join('');
      const fileSelect = `
        <p>Select a file from Google Drive:</p>
        <select id="fileSelector">${fileOptions}</select>
        <button id="processDriveFileBtn">Process File</button>
      `;
      document.getElementById('result').innerHTML = fileSelect;
      document.getElementById('processDriveFileBtn').addEventListener('click', processDriveFile);
    } else {
      alert('No CSV files found in your Google Drive.');
    }
  });
}

// Process selected file from Google Drive
function processDriveFile() {
  const fileId = document.getElementById('fileSelector').value;

  gapi.client.drive.files.get({
    fileId: fileId,
    alt: 'media',
  }).then(response => {
    const csvData = response.body;
    processCSVData(csvData);
  });
}

// Process uploaded local CSV file
function processLocalCSV() {
  const file = document.getElementById("csvInput").files[0];
  if (!file) {
    alert("No file selected!");
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    const csvData = e.target.result;
    processCSVData(csvData);
  };
  reader.readAsText(file);
}

// Process CSV data
function processCSVData(csvData) {
  const rows = csvData.split("\n").slice(1); // Remove header row

  if (!rows.length) {
    document.getElementById("result").innerHTML = "The CSV file is empty or invalid.";
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

      gameData.numbers.push(...cols.slice(4, 8).map(Number)); // Num1 to Num4
      gameData.bonus.push(Number(cols[8])); // Bonus Ball
    }
  });

  const numProbabilities = calculateProbabilities(gameData.numbers, 35);
  const bonusProbabilities = calculateProbabilities(gameData.bonus, 35);
  const predictedNumbers = getMostFrequent(gameData.numbers, 4);
  const predictedBonus = getMostFrequent(gameData.bonus, 1);

  document.getElementById('result').innerHTML = `
    <p style="color: red; font-size: 0.9rem;">Latest Drawing Date: ${gameData.latestDate}</p>
    <p style="color: black; font-size: 0.7rem;">(Played: Mon & Thur 22:12 CST)</p>
    <p><strong>Predicted Numbers for the Next Drawing:</strong></p>
    <p>Numbers: ${predictedNumbers.join(", ")}</p>
    <p>Bonus Ball: ${predictedBonus.join(", ")}</p>
    <p style="font-size: 0.9rem;"><strong>Probability Distribution:</strong></p>
    <p style="font-size: 0.8rem;"><u>Main Numbers:</u> ${formatProbabilities(numProbabilities)}</p>
    <p style="font-size: 0.8rem;"><u>Bonus Ball:</u> ${formatProbabilities(bonusProbabilities)}</p>
  `;
}

// Utility functions
function calculateProbabilities(arr, range) {
  const total = arr.length;
  const frequency = Array(range + 1).fill(0);

  arr.forEach(num => {
    if (num >= 1 && num <= range) {
      frequency[num]++;
    }
  });

  return frequency.map(count => ((count / total) * 100).toFixed(2));
}

function getMostFrequent(arr, count) {
  const frequency = {};
  arr.forEach(num => {
    frequency[num] = (frequency[num] || 0) + 1;
  });

  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([num]) => Number(num));
}

function formatProbabilities(probabilities) {
  return probabilities
    .map((prob, index) => `${index}: ${prob}%`)
    .filter((entry) => !entry.startsWith("0: 0.00%")) // Skip numbers with 0% probability
    .join("; ");
}
