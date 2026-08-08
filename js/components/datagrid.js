/*
  DataGrid Component (Excel / Enterprise Spreadsheet Simulator)
  Spreadsheet Workbench with Formula Bar, Column Sorting, & Strict Validation Rules
*/

function renderDataGrid(container) {
    const state = window.gameStore.getState();
    const dg = state.datagrid;

    const colHeaders = ["A", "B", "C", "D", "E"];

    container.innerHTML = `
        <div class="datagrid-container">
            <!-- Top Spreadsheet Toolbar -->
            <header class="datagrid-toolbar">
                <div class="file-name-group">
                    <span class="excel-icon">[XLS]</span>
                    <span class="file-name">${escapeHtml(dg.sheetName)}</span>
                    <span class="save-status" id="save-status-indicator">UNSAVED CHANGES</span>
                </div>
                <div class="toolbar-actions">
                    <button class="btn-secondary compact" id="btn-recalc-sheet">Recalculate</button>
                    <button class="btn-primary compact" id="btn-validate-grid">Validate & Submit</button>
                </div>
            </header>

            <!-- Formula Bar -->
            <div class="formula-bar-container">
                <span class="cell-ref-box">${colHeaders[dg.selectedCell.col] || 'A'}${dg.selectedCell.row + 1}</span>
                <span class="fx-label">fx</span>
                <input type="text" id="formula-input" class="formula-input" value="${escapeHtml(dg.formulaValue)}" autocomplete="off">
            </div>

            <!-- Spreadsheet Grid Table -->
            <div class="spreadsheet-viewport">
                <table class="grid-table">
                    <thead>
                        <tr>
                            <th class="row-hdr-col"></th>
                            ${colHeaders.map(col => `<th class="col-hdr">${col}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${dg.data.map((row, rIdx) => `
                            <tr>
                                <td class="row-hdr">${rIdx + 1}</td>
                                ${row.map((cellVal, cIdx) => {
                                    const isSelected = dg.selectedCell.row === rIdx && dg.selectedCell.col === cIdx;
                                    const hasSpaceBug = typeof cellVal === 'string' && cellVal.includes('\u00A0');
                                    return `
                                        <td class="cell ${isSelected ? 'selected' : ''} ${hasSpaceBug ? 'has-hidden-space' : ''}" 
                                            data-row="${rIdx}" data-col="${cIdx}">
                                            <input type="text" class="cell-editor" value="${escapeHtml(cellVal)}" 
                                                   data-row="${rIdx}" data-col="${cIdx}">
                                        </td>
                                    `;
                                }).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <!-- Bottom Status Bar & Sheet Tabs -->
            <footer class="datagrid-footer">
                <div class="sheet-tabs">
                    <button class="sheet-tab active">Q3_Regional_Metrics</button>
                    <button class="sheet-tab">Q2_Historical (Read Only)</button>
                </div>
                <div class="grid-status-info">
                    <span id="grid-status-msg">READY | Selected Cell: ${colHeaders[dg.selectedCell.col]}${dg.selectedCell.row + 1}</span>
                </div>
            </footer>
        </div>
    `;

    // Cell Selection & Editing Event Listeners
    container.querySelectorAll('.cell').forEach(cellEl => {
        cellEl.addEventListener('click', (e) => {
            const r = parseInt(cellEl.getAttribute('data-row'), 10);
            const c = parseInt(cellEl.getAttribute('data-col'), 10);
            dg.selectedCell = { row: r, col: c };
            dg.formulaValue = dg.data[r][c] || '';
            window.gameStore.notify();
        });
    });

    container.querySelectorAll('.cell-editor').forEach(inputEl => {
        inputEl.addEventListener('change', (e) => {
            const r = parseInt(inputEl.getAttribute('data-row'), 10);
            const c = parseInt(inputEl.getAttribute('data-col'), 10);
            window.gameStore.updateCell(r, c, e.target.value);
        });
    });

    // Validate Button Listener (Strict Validation Check)
    const valBtn = container.querySelector('#btn-validate-grid');
    if (valBtn) {
        valBtn.addEventListener('click', () => {
            window.gameStore.validateDataGrid();
        });
    }
}

window.renderDataGrid = renderDataGrid;

