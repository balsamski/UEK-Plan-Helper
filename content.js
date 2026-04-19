console.log("UEK Sorter: Aktywny");

function setupFilter() {
    const table = document.querySelector('table[border="1"]');
    if (!table || document.getElementById('filter-panel')) return;

    // Utwórz panel sterowania
    const panel = document.createElement('div');
    panel.id = 'filter-panel';
    panel.style = "background:#eee; padding:15px; border:2px solid #0056a3; margin-bottom:10px; border-radius:8px; font-family: sans-serif;";
    panel.innerHTML = `
        <div style="margin-bottom: 10px;"><strong>🔍 Filtrowanie planu UEK:</strong></div>
        <input type="text" id="filterInput" placeholder="Szukaj sali, przedmiotu lub grupy..." style="width: 80%; padding: 8px; border-radius: 4px; border: 1px solid #ccc;">
        <button id="clearBtn" style="padding: 8px; cursor: pointer;">X</button>
    `;
    table.parentNode.insertBefore(panel, table);

    const input = document.getElementById('filterInput');
    const rows = Array.from(table.querySelectorAll('tbody tr')).slice(1); // Wszystkie rzędy bez nagłówka

    input.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        
        for (let i = 0; i < rows.length; i++) {
            let currentRow = rows[i];
            
            // Sprawdź czy następny wiersz to "Uwagi" (nie ma własnej daty/godziny)
            let nextRow = rows[i + 1];
            let isNoteRow = nextRow && nextRow.querySelector('.uwagi');

            // Tekst do przeszukania (łączymy wiersz główny z ewentualną uwagą)
            let fullText = currentRow.innerText.toLowerCase();
            if (isNoteRow) fullText += nextRow.innerText.toLowerCase();

            if (fullText.includes(query)) {
                currentRow.style.display = "";
                if (isNoteRow) nextRow.style.display = "";
            } else {
                currentRow.style.display = "none";
                if (isNoteRow) nextRow.style.display = "none";
            }

            // Jeśli obsłużyliśmy dwa wiersze naraz, przeskocz o jeden dodatkowy
            if (isNoteRow) i++;
        }
    });

    document.getElementById('clearBtn').onclick = () => { input.value = ''; input.dispatchEvent(new Event('input')); };
}

// Uruchom po wczytaniu
setTimeout(setupFilter, 500);