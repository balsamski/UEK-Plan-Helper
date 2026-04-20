/**
 * UEK Plan Ultimate Helper v2.13
 * Zmiany: Powiększony i czytelniejszy czas, przy zachowaniu 6 sal na wydruk i wyśrodkowaniu pionowym.
 */

console.log("UEK Ultimate Planner: Aktywny (Większy czas, biznesowe ramki)");

// --- 1. KONFIGURACJA CZASU I POMOCNICZE ---
const timeSlots = [
    "08:00 - 08:45", "08:45 - 09:30", 
    "09:45 - 10:30", "10:30 - 11:15", 
    "11:30 - 12:15", "12:15 - 13:00", 
    "13:15 - 14:00", "14:00 - 14:45",
    "15:00 - 15:45", "15:45 - 16:30",
    "16:45 - 17:30", "17:30 - 18:15",
    "18:30 - 19:15", "19:15 - 20:00",
    "20:15 - 21:00"
];

const timeToMins = (t) => {
    if (!t) return 0;
    const parts = t.trim().split(':');
    return parts.length < 2 ? 0 : parseInt(parts[0]) * 60 + parseInt(parts[1]);
};

function isSlotOccupied(slotStr, eventInterval) {
    const [sSlot, eSlot] = slotStr.split(' - ').map(timeToMins);
    const [sEvent, eEvent] = eventInterval.split(' - ').map(timeToMins);
    const midSlot = sSlot + 5; 
    return midSlot >= sEvent && midSlot < eEvent;
}

const cleanRoomName = (name) => {
    if (!name) return "Nieznana sala";
    return name.split(/ lab\.| Lab|\,/)[0].trim();
};

// --- 2. PARSOWANIE TABELI ---
function parseTableFromHTML(htmlString = null) {
    let doc = document;
    if (htmlString) {
        const parser = new DOMParser();
        doc = parser.parseFromString(htmlString, 'text/html');
    }
    const table = doc.querySelector('table[border="1"]');
    if (!table) return [];

    const headerInfo = doc.querySelector('.grupa')?.innerText.trim() || "Nieznany obiekt";
    const rows = Array.from(table.querySelectorAll('tbody tr')).slice(1);
    const headers = Array.from(table.querySelectorAll('th')).map(h => h.innerText.toLowerCase());
    
    const idxPrzedmiot = headers.indexOf('przedmiot');
    const idxNauczyciel = headers.indexOf('nauczyciel');
    const idxSala = headers.indexOf('sala');

    return rows.filter(r => !r.querySelector('.uwagi')).map(row => {
        const cells = row.querySelectorAll('td');
        let rawSala = (idxSala !== -1) ? cells[idxSala].innerText.trim() : headerInfo;
        
        return {
            termin: cells[0]?.innerText.trim(),
            czas: cells[1]?.innerText.match(/\d{2}:\d{2} - \d{2}:\d{2}/)?.[0],
            przedmiot: cells[idxPrzedmiot]?.innerText.trim(),
            sala: cleanRoomName(rawSala),
            prowadzacy: (idxNauczyciel !== -1) ? cells[idxNauczyciel].innerText.split('(')[0].trim() : "---"
        };
    });
}

// --- 3. DRUKOWANIE (Z PODZIAŁEM STRON) ---
function printDay(dayId, dayDate) {
    const content = document.getElementById(dayId).innerHTML;
    const printWindow = window.open('', '_blank', 'height=600,width=900');
    printWindow.document.write(`<html><head><title>Plan UEK - ${dayDate}</title><style>
        body { font-family: sans-serif; padding: 0; margin: 0; }
        h3 { color: #0056a3; margin: 10px 10px 5px 10px; font-size: 16px; }
        table { border-collapse: collapse; width: 100%; table-layout: fixed; }
        
        th, td { border: 1px solid #cee4ff; padding: 2px !important; text-align: center; vertical-align: middle !important; word-wrap: break-word; height: auto !important; }
        th { background-color: #f2f2f2 !important; font-size: 11px !important; -webkit-print-color-adjust: exact; }
        
        td div { margin-top: 1px !important; margin-bottom: 1px !important; line-height: 1.1 !important; text-align: center; }
        
        .page-break { page-break-before: always; break-before: page; padding-top: 15px; }
        .print-only { display: block !important; color: #0056a3; margin: 0 10px 10px 10px; font-size: 16px; font-weight: bold; }
        
        @page { size: landscape; margin: 0.5cm; }
    </style></head><body>
        <h3>📅 Harmonogram: ${dayDate}</h3>
        ${content}
    </body></html>`);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 700);
}

// --- 4. GENEROWANIE HARMONOGRAMU ---
async function generateMultiSchedule() {
    const dataStore = await chrome.storage.local.get(['savedRooms']);
    const rooms = dataStore.savedRooms || [];
    if (rooms.length === 0) return alert("Brak zapisanych sal.");

    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;
    const showDetails = document.getElementById('showDetailsCb')?.checked ?? true;

    document.body.style.cursor = 'wait';
    let allEvents = [];
    for (const room of rooms) {
        try {
            const response = await fetch(room.url);
            const html = await response.text();
            allEvents = allEvents.concat(parseTableFromHTML(html));
        } catch (e) { console.error(e); }
    }

    let filteredEvents = allEvents;
    if (dateFrom) filteredEvents = filteredEvents.filter(e => e.termin >= dateFrom);
    if (dateTo) filteredEvents = filteredEvents.filter(e => e.termin <= dateTo);

    const sale = [...new Set(filteredEvents.map(d => d.sala))].sort();
    const daty = [...new Set(filteredEvents.map(d => d.termin))].sort();

    if (daty.length === 0) {
        document.body.style.cursor = 'default';
        return alert("Brak zajęć w wybranym zakresie dat.");
    }

    const chunkArray = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));
    const saleChunks = chunkArray(sale, 6);

    let html = `<div style="font-family: sans-serif; padding: 20px; background: #fff;">
                <h2 style="color: #0056a3; border-bottom: 2px solid #0056a3; margin-bottom: 5px;">Zbiorczy Harmonogram</h2>
                <div style="font-size: 12px; color: #666; margin-bottom: 15px;">Zakres: ${dateFrom || 'Początek'} do ${dateTo || 'Koniec'} (${daty.length} dni)</div>`;
    
    daty.forEach((dataDnia, index) => {
        const dayId = `day-container-${index}`;
        html += `<div style="display:flex; justify-content:space-between; align-items:center; background:#444; color:white; padding:8px; margin-top:30px; border-radius:4px;">
            <h3 style="margin:0;">📅 ${dataDnia}</h3>
            <button class="uek-print-btn" data-target="${dayId}" data-date="${dataDnia}" style="cursor:pointer; padding:5px 15px; background:#28a745; border:none; color:#fff; border-radius:4px; font-weight:bold; font-size:13px;">🖨️ Drukuj dzień</button>
        </div>
        <div id="${dayId}">`;

        saleChunks.forEach((saleChunk, chunkIdx) => {
            const isPageBreak = chunkIdx > 0;
            
            html += `
            <div class="${isPageBreak ? 'page-break' : ''}" style="margin-bottom: 30px;">
                ${saleChunks.length > 1 ? `<div style="font-weight: bold; margin-bottom: 5px; color: #0056a3;">Część ${chunkIdx + 1} z ${saleChunks.length}</div>` : ''}
                <div class="print-only" style="display: none;">📅 ${dataDnia} (cz. ${chunkIdx + 1})</div>
                
                <div style="overflow-x:auto; border:1px solid #ccc;">
                    <table style="border-collapse:collapse; width:100%; text-align:center; table-layout:fixed; min-width:${saleChunk.length * 150}px;">
                        <thead>
                            <tr style="background:#f0f0f0;">
                                <th style="width:95px; padding:6px 2px; font-size:14px; border:1px solid #bbb;">Godz.</th>
                                ${saleChunk.map(s => `<th style="padding:6px; font-size:13px; border:1px solid #bbb;">${s}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>`;

            const skipCells = {};
            saleChunk.forEach(s => skipCells[s] = 0);

            timeSlots.forEach((slot, slotIdx) => {
                // ZMIANA: Zwiększony font z 12px na 14px, usunięte letter-spacing, delikatnie zwiększony padding
                html += `<tr><td style="font-weight:bold; background:#f9f9f9; border:1px solid #ddd; font-size:16px; padding:6px 2px; vertical-align: middle;">${slot}</td>`;
                
                saleChunk.forEach(s => {
                    if (skipCells[s] > 0) {
                        skipCells[s]--;
                        return;
                    }

                    const event = filteredEvents.find(d => d.termin === dataDnia && d.sala === s && isSlotOccupied(slot, d.czas));
                    
                    if (event) {
                        let rowspanCount = 0;
                        for (let i = slotIdx; i < timeSlots.length; i++) {
                            if (isSlotOccupied(timeSlots[i], event.czas)) {
                                rowspanCount++;
                            } else {
                                break;
                            }
                        }

                        if (rowspanCount > 1) {
                            skipCells[s] = rowspanCount - 1;
                        }
                        
                        const cellStyle = [
                            `background: #e7f3ff !important`,
                            `color: #333`,
                            `border: 2px solid #0056a3`,
                            `padding: 4px`,
                            `vertical-align: middle !important`,
                            `text-align: center`,             
                            `-webkit-print-color-adjust: exact`
                        ].join(';');

                        html += `<td rowspan="${rowspanCount}" style="${cellStyle}">
                            ${showDetails ? `<div style="font-size: 11px; font-weight: bold; color: #0056a3; margin-bottom: 4px; text-align: center;">⌚ ${event.czas}</div>` : ''}
                            <div style="font-weight: bold; font-size: 15px; color: #b71c1c; margin-top: 2px; text-align: center;">${event.prowadzacy}</div>
                            ${showDetails ? `<div style="font-size: 11px; margin-top: 4px; color: #444; line-height: 1.2; text-align: center;">${event.przedmiot}</div>` : ''}
                        </td>`;
                    } else { 
                        html += `<td style="border:1px solid #eee; background:#fff;"></td>`; 
                    }
                });
                html += `</tr>`;
            });
            html += `</tbody></table></div></div>`;
        });
        html += `</div>`;
    });

    const container = document.getElementById('matrix-container') || document.createElement('div');
    container.id = 'matrix-container';
    container.innerHTML = html;
    document.querySelector('table[border="1"]').style.display = 'none';
    document.querySelector('.grupa').parentNode.insertBefore(container, document.querySelector('.MBJ'));
    container.querySelectorAll('.uek-print-btn').forEach(btn => { btn.onclick = () => printDay(btn.dataset.target, btn.dataset.date); });
    document.body.style.cursor = 'default';
}

// --- 5. LOGIKA LISTY SAL ---
async function removeRoom(url) {
    let d = await chrome.storage.local.get(['savedRooms']);
    let r = (d.savedRooms || []).filter(x => x.url !== url);
    await chrome.storage.local.set({ savedRooms: r });
    renderSavedRoomsList();
}

async function renderSavedRoomsList() {
    const listContainer = document.getElementById('saved-rooms-list');
    if (!listContainer) return;
    const d = await chrome.storage.local.get(['savedRooms']);
    const rooms = d.savedRooms || [];
    if (rooms.length === 0) {
        listContainer.innerHTML = '<em style="color:#999;">Brak zapisanych sal.</em>';
        return;
    }
    listContainer.innerHTML = rooms.map(room => `
        <div style="display:inline-flex; align-items:center; background:#f0f7ff; border:1px solid #bcdbff; padding:4px 10px; margin:3px; border-radius:15px; font-size:13px;">
            <span style="margin-right:8px; font-weight:bold; color:#0056a3;">${room.name}</span>
            <span class="remove-room" data-url="${room.url}" style="cursor:pointer; color:#ff4d4d; font-weight:bold; font-size:18px; line-height: 1;">&times;</span>
        </div>
    `).join('');
    listContainer.querySelectorAll('.remove-room').forEach(btn => { btn.onclick = () => removeRoom(btn.dataset.url); });
    const btnGen = document.getElementById('btnGenMulti');
    if (btnGen) btnGen.innerText = `📊 Harmonogram (${rooms.length})`;
}

// --- 6. PANEL GŁÓWNY ---
async function setupPlugin() {
    const table = document.querySelector('table[border="1"]');
    if (!table || document.getElementById('uek-helper-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'uek-helper-panel';
    panel.style = "background:#fff; padding:15px; border:2px solid #0056a3; margin-bottom:15px; border-radius:8px; box-shadow:0 4px 10px rgba(0,0,0,0.1); font-family:sans-serif;";
    panel.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:1px solid #eee; padding-bottom:10px; margin-bottom:10px;">
            <div>
                <strong style="color:#0056a3; display:block; margin-bottom:8px; font-size: 18px;">🚀 UEK Multi-Planner</strong>
                <div id="saved-rooms-list" style="max-width:600px; margin-bottom:12px;"></div>
                
                <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center;">
                    <div style="font-size:13px; color:#444; background: #f9f9f9; padding: 6px 10px; border-radius: 4px; border: 1px solid #eee;">
                        📅 Zakres dat: 
                        <input type="date" id="dateFrom" style="padding:4px; border:1px solid #ccc; border-radius:3px;"> 
                        do 
                        <input type="date" id="dateTo" style="padding:4px; border:1px solid #ccc; border-radius:3px;">
                    </div>
                    <div style="font-size:13px; color:#444; background: #f9f9f9; padding: 6px 10px; border-radius: 4px; border: 1px solid #eee;">
                        <label style="cursor: pointer; font-weight: bold; display: flex; align-items: center; gap: 5px;">
                            <input type="checkbox" id="showDetailsCb" checked style="transform: scale(1.2);"> 
                            Pokaż szczegóły (przedmiot, godziny)
                        </label>
                    </div>
                </div>

            </div>
            <div style="display:flex; gap:8px; align-items: center; flex-wrap: wrap; justify-content: flex-end;">
                <button id="btnSaveRoom" style="background:#28a745; color:white; border:none; padding:10px 14px; border-radius:4px; cursor:pointer; font-weight: bold; font-size: 14px;">➕ Zapisz tę salę</button>
                <button id="btnGenMulti" style="background:#0056a3; color:white; border:none; padding:10px 14px; border-radius:4px; cursor:pointer; font-weight:bold; font-size: 14px;">📊 Harmonogram</button>
                <button id="btnReset" style="background:#666; color:white; border:none; padding:10px 14px; border-radius:4px; cursor:pointer; font-size: 14px;">↩ Lista</button>
            </div>
        </div>
        <div>
            <strong style="font-size: 14px;">🔍 Filtruj bieżący widok:</strong>
            <input type="text" id="filterInput" placeholder="Szukaj sali, prowadzącego, grupy..." style="width:50%; padding:8px; border:1px solid #ccc; border-radius:4px; margin-left:10px; font-size: 14px;">
        </div>
    `;
    table.parentNode.insertBefore(panel, table);

    const input = document.getElementById('filterInput');
    input.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const rows = Array.from(table.querySelectorAll('tbody tr')).slice(1);
        for (let i = 0; i < rows.length; i++) {
            let row = rows[i];
            let nextRow = rows[i + 1];
            let isNote = nextRow && nextRow.querySelector('.uwagi');
            let text = row.innerText.toLowerCase() + (isNote ? nextRow.innerText.toLowerCase() : "");
            let show = text.includes(query);
            row.style.display = show ? "" : "none";
            if (isNote) { nextRow.style.display = show ? "" : "none"; i++; }
        }
    });

    document.getElementById('btnReset').onclick = () => location.reload();
    document.getElementById('btnGenMulti').onclick = generateMultiSchedule;
    
    document.getElementById('btnSaveRoom').onclick = async () => {
        const rawHeader = document.querySelector('.grupa')?.innerText.trim();
        const headerInfo = cleanRoomName(rawHeader);
        
        let currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('okres', '2');
        const finalUrl = currentUrl.toString();

        if (!finalUrl.includes('id=')) return alert("Nie można zapisać - to nie jest plan konkretnego obiektu.");

        let d = await chrome.storage.local.get(['savedRooms']);
        let r = d.savedRooms || [];
        
        if (!r.find(x => x.url === finalUrl)) {
            r.push({ name: headerInfo, url: finalUrl });
            await chrome.storage.local.set({ savedRooms: r });
            renderSavedRoomsList();
        }
    };
    renderSavedRoomsList();
}

setTimeout(setupPlugin, 500);