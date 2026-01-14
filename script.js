// Select the container element
const container = document.getElementById("sql-cleaner-container");
if (!container) {
    throw new Error("Container #sql-cleaner-container not found");
}

// Insert the app HTML
container.innerHTML = `
  <div class="sql-cleaner">
    <h2>SQL Cleaner</h2>
    <div class="sql-cleaner__row">
      <div class="sql-cleaner__col">
        <label for="sql-input">SQL original</label>
        <textarea id="sql-input" rows="15" cols="80" placeholder="Paste your SQL here..."></textarea>
      </div>
      <div class="sql-cleaner__col">
        <label for="sql-output">SQL without comments</label>
        <textarea id="sql-output" rows="15" cols="80" readonly placeholder="Cleaned SQL will appear here..."></textarea>
      </div>
    </div>
    <div class="sql-cleaner__actions">
      <button id="clean-btn">Remove comments</button>
      <button id="copy-btn">Copy to clipboard</button>
    </div>
  </div>
`;

const input = document.getElementById("sql-input");
const output = document.getElementById("sql-output");
const cleanBtn = document.getElementById("clean-btn");
const copyBtn = document.getElementById("copy-btn");

// Function to remove SQL comments
const removeComments = (sql) => {
    // Remove multiline comments /* ... */
    let result = sql.replace(/\/\*[\s\S]*?\*\//g, "");

    // Remove line comments -- until end of line
    result = result.replace(/--.*$/gm, "");

    return result;
};

// Event: clean and show the result
cleanBtn.addEventListener("click", () => {
    const cleaned = removeComments(input.value);
    output.value = cleaned;
});

// Event: copy the cleaned text to clipboard
copyBtn.addEventListener("click", () => {
    if (!output.value) return;

    output.select();
    try {
        document.execCommand("copy");
        copyBtn.textContent = "Copied!";
        setTimeout(() => {
            copyBtn.textContent = "Copy to clipboard";
        }, 1500);
    } catch (err) {
        console.error("Copy error:", err);
        alert("Failed to copy to clipboard.");
    }
});
