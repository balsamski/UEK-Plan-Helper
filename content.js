/**
 * UEK Plan Ultimate Helper v2.2
 * Funkcje: Filtrowanie, Lista sal, Wybór zakresu dat, Harmonogram blokowy, Drukowanie.
 */

console.log("UEK Ultimate Planner: Aktywny z wyborem dat");

// --- 1. KONFIGURACJA CZASU ---
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

// Pomocnicza do parsowania daty z formatu UEK (YYYY-MM-DD) na obiekt Date
const parseDateUEK = (dateStr) => new Date(dateStr);

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
        return {
            termin: cells[0]?.innerText.trim(), // Format: YYYY-MM-DD
            czas: cells[1]?.innerText.match(/\d{2}:\d{2} - \d{2}:\d{2}/)?.[0],
            przedmiot: cells[idxPrzedmiot]?.innerText.trim(),
            sala: (idxSala !== -1) ? cells[idxSala].innerText.trim() : headerInfo,
            prowadzacy: (idxNauczyciel !== -1) ? cells[idxNauczyciel].innerText.split('(')[0].trim() : "---"
        };
    });
}

// --- 3. DRUKOWANIE ---
function printDay(dayId, dayDate) {
    const content = document.getElementById(dayId).innerHTML;
    const printWindow = window.open('', '_blank', 'height=600,width=900');
    printWindow.document.write(`<html><head><title>Plan UEK - ${dayDate}</title><style>
        body { font-family: sans-serif; padding: 20px; }
        table { border-collapse: collapse; width: 100%; table-layout: fixed; }
        th, td { border: 1px solid #cee4ff; padding: 6px; text-align: center; font-size: 9px; word-wrap: break-word; }
        th { background-color: #f2f2f2 !important; -webkit-print-color-adjust: exact; }
        h3 { color: #0056a3; }
        @page { size: landscape; margin: 1cm; }
    </style></head><body><h3>📅 Harmonogram: ${dayDate}</h3>${content}</body></html>`);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 700);
}

// --- 4. GENEROWANIE HARMONOGRAMU ---
async function generateMultiSchedule() {
    const dataStore = await chrome.storage.local.get(['savedRooms']);
    const rooms = dataStore.savedRooms || [];
    if (rooms.length === 0) return alert("Brak zapisanych sal.");

    // Pobierz daty z pól input
    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;

    document.body.style.cursor = 'wait';
    let allEvents = [];
    for (const room of rooms) {
        try {
            const response = await fetch(room.url);
            const html = await response.text();
            allEvents = allEvents.concat(parseTableFromHTML(html));
        } catch (e) { console.error(e); }
    }

    // Filtrowanie po datach
    let filteredEvents = allEvents;
    if (dateFrom) {
        filteredEvents = filteredEvents.filter(e => e.termin >= dateFrom);
    }
    if (dateTo) {
        filteredEvents = filteredEvents.filter(e => e.termin <= dateTo);
    }

    const sale = [...new Set(filteredEvents.map(d => d.sala))].sort();
    const daty = [...new Set(filteredEvents.map(d => d.termin))].sort();

    if (daty.length === 0) {
        document.body.style.cursor = 'default';
        return alert("Brak zajęć w wybranym zakresie dat.");
    }

    let html = `<div style="font-family: sans-serif; padding: 20px; background: #fff;">
                <h2 style="color: #0056a3; border-bottom: 2px solid #0056a3;">Zbiorczy Harmonogram</h2>
                <div style="font-size: 12px; color: #666; margin-bottom: 15px;">Zakres: ${dateFrom || 'Początek'} do ${dateTo || 'Koniec'} (${daty.length} dni)</div>`;
    
    daty.forEach((dataDnia, index) => {
        const dayId = `day-container-${index}`;
        html += `<div style="display:flex; justify-content:space-between; align-items:center; background:#444; color:white; padding:8px; margin-top:30px; border-radius:4px;">
            <h3 style="margin:0;">📅 ${dataDnia}</h3>
            <button class="uek-print-btn" data-target="${dayId}" data-date="${dataDnia}" style="cursor:pointer; padding:5px 10px; background:#28a745; border:none; color:#fff; border-radius:4px;">🖨️ Drukuj</button>
        </div>
        <div id="${dayId}" style="overflow-x:auto; border:1px solid #ccc;"><table style="border-collapse:collapse; width:100%; text-align:center; table-layout:fixed; min-width:${sale.length*150}px;">
        <thead><tr style="background:#f0f0f0;"><th style="width:90px;">Czas</th>${sale.map(s => `<th style="padding:10px; font-size:11px; border:1px solid #bbb;">${s}</th>`).join('')}</tr></thead><tbody>`;

        timeSlots.forEach((slot, slotIdx) => {
            html += `<tr><td style="font-weight:bold; background:#f9f9f9; border:1px solid #ddd; font-size:10px;">${slot}</td>`;
            sale.forEach(s => {
                const event = filteredEvents.find(d => d.termin === dataDnia && d.sala === s && isSlotOccupied(slot, d.czas));
                if (event) {
                    const isCont = timeSlots[slotIdx-1] && isSlotOccupied(timeSlots[slotIdx-1], event.czas);
                    const isNext = timeSlots[slotIdx+1] && isSlotOccupied(timeSlots[slotIdx+1], event.czas);
                    const st = `background:#e7f3ff!important; color:#333; border-left:1px solid #cee4ff; border-right:1px solid #cee4ff; vertical-align:middle; ${isCont?'border-top:1px solid #e7f3ff':'border-top:1px solid #cee4ff'}; ${isNext?'border-bottom:1px solid #e7f3ff':'border-bottom:1px solid #cee4ff'}; -webkit-print-color-adjust:exact;`;
                    html += `<td style="${st}">${!isCont ? `<div style="font-size:8px; font-weight:bold; color:#0056a3;">⌚ ${event.czas}</div><div style="font-weight:bold; font-size:10px; color:#b71c1c;">${event.prowadzacy}</div><div style="font-size:9px;">${event.przedmiot}</div>` : ''}</td>`;
                } else { html += `<td style="border:1px solid #eee;"></td>`; }
            });
            html += `</tr>`;
        });
        html += `</tbody></table></div>`;
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
        <div style="display:inline-flex; align-items:center; background:#f0f7ff; border:1px solid #bcdbff; padding:2px 8px; margin:2px; border-radius:15px; font-size:12px;">
            <span style="margin-right:8px; font-weight:bold; color:#0056a3;">${room.name.split(',')[0]}</span>
            <span class="remove-room" data-url="${room.url}" style="cursor:pointer; color:#ff4d4d; font-weight:bold; font-size:14px;">&times;</span>
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
                <strong style="color:#0056a3; display:block; margin-bottom:5px;">🚀 UEK Multi-Planner</strong>
                <div id="saved-rooms-list" style="max-width:500px; margin-bottom:10px;"></div>
                <div style="font-size:12px; color:#444;">
                    Zakres dat (opcjonalnie): 
                    <input type="date" id="dateFrom" style="padding:2px; border:1px solid #ccc; border-radius:3px;"> 
                    do 
                    <input type="date" id="dateTo" style="padding:2px; border:1px solid #ccc; border-radius:3px;">
                </div>
            </div>
            <div style="display:flex; gap:5px;">
                <button id="btnSaveRoom" style="background:#28a745; color:white; border:none; padding:8px 12px; border-radius:4px; cursor:pointer;">➕ Zapisz tę salę</button>
                <button id="btnGenMulti" style="background:#0056a3; color:white; border:none; padding:8px 12px; border-radius:4px; cursor:pointer; font-weight:bold;">📊 Harmonogram</button>
                <button id="btnReset" style="background:#666; color:white; border:none; padding:8px 12px; border-radius:4px; cursor:pointer;">↩ Lista</button>
            </div>
        </div>
        <div>
            <strong>🔍 Filtruj bieżący widok:</strong>
            <input type="text" id="filterInput" placeholder="Szukaj..." style="width:50%; padding:6px; border:1px solid #ccc; border-radius:4px; margin-left:10px;">
        </div>
    `;
    table.parentNode.insertBefore(panel, table);

    // Filtrowanie
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
        const headerInfo = document.querySelector('.grupa')?.innerText.trim();
        const url = window.location.href;
        if (!url.includes('id=')) return;
        let d = await chrome.storage.local.get(['savedRooms']);
        let r = d.savedRooms || [];
        if (!r.find(x => x.url === url)) {
            r.push({ name: headerInfo, url: url });
            await chrome.storage.local.set({ savedRooms: r });
            renderSavedRoomsList();
        }
    };
    renderSavedRoomsList();
}

setTimeout(setupPlugin, 500);