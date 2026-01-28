// Select the container element
const container = document.getElementById("sql-cleaner-container");
if (!container) {
    throw new Error("Container #sql-cleaner-container not found");
}

// Insert the app HTML with Paste + Paste&Copy + checkboxes
container.innerHTML = `
  <div class="sql-cleaner">
    <div class="sql-cleaner__header">
      <h2>SQL Cleaner</h2>
      <p class="subtitle">Made by Tommaso Facchin</p>
      <div class="sql-cleaner__toolbar">
        <button id="paste-btn" class="sql-btn">Paste</button>
        <button id="paste-copy-btn" class="sql-btn">Paste & Copy</button>

        <div class="sql-toggle-group">
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

          <div class="sql-toggle">
            <input
              type="checkbox"
              id="remove-empty-lines"
              class="sql-toggle__checkbox visually-hidden-checkbox"
              checked
            >
            <label for="remove-empty-lines" class="sql-toggle__label">
              Remove extra blank lines
            </label>
          </div>
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
const removeEmptyLinesCheckbox = document.getElementById("remove-empty-lines");

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

// Remove comments
const stripComments = (sql) => {
    // Remove multiline comments /* ... */
    let result = sql.replace(/\/\*[\s\S]*?\*\//g, "");

    // Remove all line comments --
    result = result.replace(/--.*$/gm, "");

    return result;
};

// Collapse multiple blank lines to at most one blank line
const collapseBlankLines = (sql) => {
    // Non ci devono essere 2+ righe vuote di fila
    return sql.replace(/\n\s*\n+/g, "\n\n"); // [web:23]
};

// Full clean pipeline based on checkboxes
const getProcessedText = () => {
    let result = input.value;

    if (removeCommentsCheckbox.checked) {
        result = stripComments(result);
    }

    if (removeEmptyLinesCheckbox.checked) {
        result = collapseBlankLines(result);
    }

    return result;
};

// Update output
const updateOutput = () => {
    const textToProcess = getProcessedText();
    output.innerHTML = highlightSql(textToProcess);
};

pasteBtn.addEventListener("click", async () => {
    try {
        const text = await navigator.clipboard.readText();
        input.value = text;
        updateOutput();
    } catch (err) {
        // ignore
    }
});

// Paste & Copy button handler
pasteCopyBtn.addEventListener("click", async () => {
    try {
        // 1. Paste from clipboard
        input.focus();
        input.select();

        try {
            const text = await navigator.clipboard.readText();
            input.value = text;
        } catch {
            return;
        }

        input.dispatchEvent(new Event("input", { bubbles: true }));

        // 2. Immediately copy cleaned result
        await new Promise(resolve => setTimeout(resolve, 50));
        const textToCopy = getProcessedText();

        await navigator.clipboard.writeText(textToCopy);
    } catch (err) {
        console.error("Paste & Copy error:", err);
    }
});

// Event listeners
input.addEventListener("input", updateOutput);
input.addEventListener("paste", () => setTimeout(updateOutput, 0));
removeCommentsCheckbox.addEventListener("change", updateOutput);
removeEmptyLinesCheckbox.addEventListener("change", updateOutput);

// Copy to clipboard
copyBtn.addEventListener("click", () => {
    if (!input.value) return;

    const textToCopy = getProcessedText();

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
