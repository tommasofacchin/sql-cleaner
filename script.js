// Select the container element
const container = document.getElementById("sql-cleaner-container");
if (!container) {
    throw new Error("Container #sql-cleaner-container not found");
}

// Insert the app HTML with Paste + Paste&Copy + checkbox
container.innerHTML = `
  <div class="sql-cleaner">
    <div class="sql-cleaner__header">
      <h2>SQL Cleaner</h2>
      <div class="sql-cleaner__toolbar">
        <button id="paste-btn" class="sql-btn">Paste</button>
        <button id="paste-copy-btn" class="sql-btn">Paste & Copy</button>

        <div class="sql-toggle">
          <input
            type="checkbox"
            id="remove-comments"
            class="sql-toggle__checkbox visually-hidden-checkbox"
            checked
          >
          <label for="remove-comments" class="sql-toggle__label">
            Remove comments
          </label>
        </div>
      </div>
    </div>
    <div class="sql-cleaner__row">
      <div class="sql-cleaner__col">
        <label for="sql-input">SQL original</label>
        <textarea id="sql-input" rows="30" cols="80" placeholder="Paste your SQL here..."></textarea>
      </div>
      <div class="sql-cleaner__col">
        <label>SQL cleaned</label>
        <pre id="sql-output" class="sql-output"></pre>
      </div>
    </div>
    <div class="sql-cleaner__actions">
      <button id="copy-btn" class="sql-btn">Copy to clipboard</button>
    </div>
  </div>
`;



// DOM elements
const input = document.getElementById("sql-input");
const output = document.getElementById("sql-output");
const copyBtn = document.getElementById("copy-btn");
const pasteBtn = document.getElementById("paste-btn");
const pasteCopyBtn = document.getElementById("paste-copy-btn");
const removeCommentsCheckbox = document.getElementById("remove-comments");

// Common SQL keywords (add more as needed)
const keywords = [
    "SELECT", "INSERT", "UPDATE", "DELETE", "FROM", "WHERE", "AND", "OR",
    "JOIN", "INNER", "LEFT", "RIGHT", "ON", "GROUP", "BY", "HAVING", "ORDER",
    "LIMIT", "OFFSET", "AS", "DISTINCT", "COUNT", "SUM", "AVG", "MIN", "MAX",
    "CREATE", "TABLE", "DROP", "ALTER", "INDEX", "PRIMARY", "KEY", "FOREIGN",
    "REFERENCES", "UNION", "EXISTS", "IN", "LIKE", "IS", "NULL", "NOT", "BETWEEN",
    "BEGIN", "USE", "GO", "SET", "PROCEDURE", "INT", "CHAR", "VARCHAR", "FLOAT", "DECIMAL"
];

// SQL syntax highlighting function
const highlightSql = (sql) => {
    const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    return sql.split("\n").map(line => {
        let html = "";
        let i = 0;

        while (i < line.length) {
            const char = line[i];

            // Single quoted strings '...'
            if (char === "'") {
                let j = i + 1;
                while (j < line.length && line[j] !== "'") j++;
                if (j < line.length) j++;

                const str = line.slice(i, j);
                html += `<span class="string">${str}</span>`;
                i = j;
                continue;
            }

            // Double quoted strings "..."
            if (char === '"') {
                let j = i + 1;
                while (j < line.length && line[j] !== '"') j++;
                if (j < line.length) j++;

                const str = line.slice(i, j);
                html += `<span class="string">${str}</span>`;
                i = j;
                continue;
            }

            // Line comments -- (show them highlighted if not removed)
            if (char === "-" && i + 1 < line.length && line[i + 1] === "-") {
                const comment = line.slice(i);
                html += `<span class="comment">${comment}</span>`;
                i = line.length;
                continue;
            }

            // Keywords: only whole words, not part of identifiers
            let matched = false;
            for (const kw of keywords) {
                const escapedKw = escapeRegExp(kw);
                const regex = new RegExp(`^${escapedKw}\\b`, "i");

                if (line.slice(i).match(regex)) {
                    // Check previous character: if letter/digit/underscore, not a keyword
                    const prevChar = i > 0 ? line[i - 1] : "";
                    if (prevChar && /[a-zA-Z0-9_]/.test(prevChar)) {
                        // e.g. @varumlun_fIN → don't highlight IN
                        html += char;
                        i++;
                        matched = true;
                        break;
                    }

                    // Valid keyword
                    html += `<span class="keyword">${kw}</span>`;
                    i += kw.length;
                    matched = true;
                    break;
                }
            }

            if (!matched) {
                html += char;
                i++;
            }
        }

        return html;
    }).join("<br>");
};

// Remove all comments function
const removeComments = (sql) => {
    // Remove multiline comments /* ... */
    let result = sql.replace(/\/\*[\s\S]*?\*\//g, "");

    // Remove all line comments --
    result = result.replace(/--.*$/gm, "");

    return result;
};

// Update output based on checkbox state
const updateOutput = () => {
    const shouldRemoveComments = removeCommentsCheckbox.checked;
    const textToProcess = shouldRemoveComments ? removeComments(input.value) : input.value;
    output.innerHTML = highlightSql(textToProcess);
};


pasteBtn.addEventListener("click", async () => {
    try {
        const text = await navigator.clipboard.readText(); 

        input.value = text;

        updateOutput();
    } catch (err) {
    }
});




// Paste & Copy button handler
pasteCopyBtn.addEventListener("click", async () => {
    try {
        // 1. Paste from clipboard
        input.focus();
        input.select();

        // Try clipboard API first
        try {
            const text = await navigator.clipboard.readText();
            input.value = text;
        } catch {
            return;
        }

        input.dispatchEvent(new Event('input', { bubbles: true }));

        // 2. Immediately copy cleaned result
        await new Promise(resolve => setTimeout(resolve, 50)); // wait for update
        const shouldRemoveComments = removeCommentsCheckbox.checked;
        const textToCopy = shouldRemoveComments ? removeComments(input.value) : input.value;

        await navigator.clipboard.writeText(textToCopy);


    } catch (err) {
        console.error("Paste & Copy error:", err);
    }
});

// Event listeners
input.addEventListener("input", updateOutput);
input.addEventListener("paste", () => setTimeout(updateOutput, 0));
removeCommentsCheckbox.addEventListener("change", updateOutput);

// Copy to clipboard 
copyBtn.addEventListener("click", () => {
    if (!input.value) return;

    const shouldRemoveComments = removeCommentsCheckbox.checked;
    const textToCopy = shouldRemoveComments ? removeComments(input.value) : input.value;

    navigator.clipboard.writeText(textToCopy).then(() => {
        copyBtn.textContent = "Copied!";
        setTimeout(() => {
            copyBtn.textContent = "Copy to clipboard";
        }, 1500);
    }).catch(err => {
        console.error("Copy error:", err);
        alert("Failed to copy to clipboard.");
    });
});

// Initialize
updateOutput();
