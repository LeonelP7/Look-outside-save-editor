const navBtns = document.querySelectorAll('.nav-btn');
const sections = document.querySelectorAll('.section');

function initSideBar() {
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const section = btn.dataset.section;
            sections.forEach(sec => sec.classList.remove('active'));
            navBtns.forEach(b => b.classList.remove('active'));
            document.getElementById(`section-${section}`).classList.add('active');
            btn.classList.add('active');
        });
    });
}

function initInfoPanel(data) {
    const actorsHtml = data.party._actors
        .map(actor => `<div>
            <span>${data.actors._data[actor]._name}</span>
            <span>HP: ${data.actors._data[actor]._hp}</span>
            <span>MP: ${data.actors._data[actor]._mp}</span>
        </div>`)
        .join('');

    document.getElementById('info-panel').innerHTML = `
        <span>Gold: ${data.party._gold}</span>
        ${actorsHtml}
        <button id="guardar-btn">Save</button>
    `;

    document.getElementById('guardar-btn').addEventListener('click', () => {
        window.api.writeSave(currentSlot, data);
        saveData = window.api.readSave(currentSlot);
        initUi(saveData);
    });
}

function initActorsSection(data) {
    const PARAM_NAMES = ['MaxHP', 'MaxMP', 'ATK', 'DEF', 'MAT', 'MDF', 'AGI', 'LUK'];

    const actorsButtonsHtml = data.party._actors
        .map(actor => `<div>
            <button class="actorId-btn" data-actor="${actor}">${data.actors._data[actor]._name}</button>
        </div>`)
        .join('');

    document.getElementById('actors-list').innerHTML = actorsButtonsHtml;

    document.querySelectorAll('.actorId-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const actor = parseInt(btn.dataset.actor);

            document.querySelectorAll('.actorId-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const paramsHtml = data.actors._data[actor]._paramPlus
                .map((valor, indice) => `<label>${PARAM_NAMES[indice]}:
                    <input type="number" class="param-input" data-indice="${indice}" value="${valor}">
                </label>`)
                .join('');

            document.getElementById('actor-detail').innerHTML = `
                <span>${data.actors._data[actor]._name}</span>
                <label>HP: <input type="number" id="actor-hp" value="${data.actors._data[actor]._hp}"></label>
                <label>MP: <input type="number" id="actor-mp" value="${data.actors._data[actor]._mp}"></label>
                <label>Level: <input type="number" id="actor-level" value="${data.actors._data[actor]._level}"></label>
                ${paramsHtml}
            `;

            const fields = [
                { id: 'actor-hp', key: '_hp' },
                { id: 'actor-mp', key: '_mp' },
                { id: 'actor-level', key: '_level' },
            ];

            fields.forEach(field => {
                document.getElementById(field.id).addEventListener('change', (e) => {
                    data.actors._data[actor][field.key] = parseInt(e.target.value);
                });
            });

            document.querySelectorAll('.param-input').forEach(input => {
                input.addEventListener('change', (e) => {
                    const indice = parseInt(e.target.dataset.indice);
                    data.actors._data[actor]._paramPlus[indice] = parseInt(e.target.value);
                });
            });
        });
    });
}

function initPartySection(data) {
    document.getElementById('party-detail').innerHTML = `
        <label>Gold: <input type="number" id="party-gold" value="${data.party._gold}"></label>
        <button id="heal-btn">Heal all</button>
    `;

    document.getElementById('party-gold').addEventListener('change', (e) => {
        data.party._gold = parseInt(e.target.value);
    });

    document.getElementById('heal-btn').addEventListener('click', () => {
        data.party._actors.forEach(actorId => {
            data.actors._data[actorId]._hp = 999999;
            data.actors._data[actorId]._mp = 999999;
        });
        console.log('All party members healed.');
    });
}

function initItemsSection(data) {
    const itemsHtml = Object.entries(data.party._items)
        .map(([id, cantidad]) => `<div>
              <span>${gameData.items[id] || 'Item ' + id}</span>
              <input type="number" class="item-input" data-id="${id}" value="${cantidad}" min="0">
          </div>`)
        .join('');

    document.getElementById('section-items').innerHTML = `
        <div id="items-search">
            <input type="text" id="item-search-input" placeholder="Search item...">
            <div id="item-search-results"></div>
        </div>
        <div id="items-list">${itemsHtml}</div>
    `;

    document.querySelectorAll('.item-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const id = e.target.dataset.id;
            const qty = parseInt(e.target.value);
            if (qty === 0) delete data.party._items[id];
            else data.party._items[id] = qty;
        });
    });

    document.getElementById('item-search-input').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        if (query.length < 2) {
            document.getElementById('item-search-results').innerHTML = '';
            return;
        }
        const results = Object.entries(gameData.items)
            .filter(([id, name]) => name.toLowerCase().includes(query))
            .slice(0, 10);

        document.getElementById('item-search-results').innerHTML = results
            .map(([id, name]) => `<div class="search-result" data-id="${id}">${name}</div>`)
            .join('');
    });

    document.getElementById('item-search-results').addEventListener('click', (e) => {
        const result = e.target.closest('.search-result');
        if (!result) return;

        const id = result.dataset.id;
        if (data.party._items[id]) data.party._items[id]++;
        else data.party._items[id] = 1;

        document.getElementById('item-search-input').value = '';
        document.getElementById('item-search-results').innerHTML = '';
        initItemsSection(data);
    });
}

function initGearSection(data) {
    const weaponsHtml = Object.entries(data.party._weapons)
        .map(([id, cantidad]) => `<div>
              <span>${gameData.weapons[id] || 'Weapon ' + id}</span>
              <input type="number" class="gear-input" data-id="${id}" data-type="weapon" value="${cantidad}" min="0">
          </div>`)
        .join('');

    const armorsHtml = Object.entries(data.party._armors)
        .map(([id, cantidad]) => `<div>
              <span>${gameData.armors[id] || 'Armor ' + id}</span>
              <input type="number" class="gear-input" data-id="${id}" data-type="armor" value="${cantidad}" min="0">
          </div>`)
        .join('');

    document.getElementById('section-gear').innerHTML = `
        <div id="items-search">
            <input type="text" id="gear-search-input" placeholder="Search gear...">
            <div id="gear-search-results"></div>
        </div>
        <div id="items-list">${weaponsHtml + armorsHtml}</div>
    `;

    document.querySelectorAll('.gear-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const id = e.target.dataset.id;
            const qty = parseInt(e.target.value);
            const type = e.target.dataset.type;
            if (type === 'weapon') {
                if (qty === 0) delete data.party._weapons[id];
                else data.party._weapons[id] = qty;
            } else {
                if (qty === 0) delete data.party._armors[id];
                else data.party._armors[id] = qty;
            }
        });
    });

    document.getElementById('gear-search-input').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        if (query.length < 2) {
            document.getElementById('gear-search-results').innerHTML = '';
            return;
        }
        const weaponResults = Object.entries(gameData.weapons)
            .filter(([id, name]) => name.toLowerCase().includes(query))
            .map(([id, name]) => `<div class="search-result" data-id="${id}" data-type="weapon">${name} (weapon)</div>`);
        const armorResults = Object.entries(gameData.armors)
            .filter(([id, name]) => name.toLowerCase().includes(query))
            .map(([id, name]) => `<div class="search-result" data-id="${id}" data-type="armor">${name} (armor)</div>`);

        document.getElementById('gear-search-results').innerHTML = weaponResults.concat(armorResults).slice(0, 10).join('');
    });

    document.getElementById('gear-search-results').addEventListener('click', (e) => {
        const result = e.target.closest('.search-result');
        if (!result) return;

        const id = result.dataset.id;
        const type = result.dataset.type;

        if (type === 'weapon') {
            if (data.party._weapons[id]) data.party._weapons[id]++;
            else data.party._weapons[id] = 1;
        } else {
            if (data.party._armors[id]) data.party._armors[id]++;
            else data.party._armors[id] = 1;
        }

        document.getElementById('gear-search-input').value = '';
        document.getElementById('gear-search-results').innerHTML = '';
        initGearSection(data);
    });
}

function initUi(data) {
    initSideBar();
    initInfoPanel(data);
    initActorsSection(data);
    initPartySection(data);
    initItemsSection(data);
    initGearSection(data);
}

let saveData;
let currentSlot = 1;
let gameData;

function showSetup() {
    document.getElementById('app').innerHTML = `
        <div id="setup-screen">
            <h1>Look Outside Editor</h1>
            <p>First time setup — enter the game folder paths.</p>
            <div class="setup-field">
                <label>Save folder:</label>
                <input type="text" id="input-save-path" placeholder="D:\\SteamLibrary\\steamapps\\common\\Look Outside\\save">
            </div>
            <div class="setup-field">
                <label>Game data folder:</label>
                <input type="text" id="input-data-path" placeholder="D:\\SteamLibrary\\steamapps\\common\\Look Outside\\data">
            </div>
            <button id="setup-btn">Save and continue</button>
            <p id="setup-error" class="setup-error"></p>
        </div>
    `;

    document.getElementById('setup-btn').addEventListener('click', () => {
        const savePath = document.getElementById('input-save-path').value.trim();
        const dataPath = document.getElementById('input-data-path').value.trim();

        if (!savePath || !dataPath) {
            document.getElementById('setup-error').textContent = 'Please fill in both fields.';
            return;
        }

        try {
            window.api.saveConfig({ savePath, dataPath });
            location.reload();
        } catch (e) {
            document.getElementById('setup-error').textContent = 'Error saving config: ' + e.message;
        }
    });
}

function showSlotSelector() {
    const saves = window.api.listSaves();
    document.getElementById('app').innerHTML = `
        <div id="slot-selector">
            <h2>Select a save file</h2>
            ${saves.map(f => `<button class="slot-btn" data-slot="${parseInt(f.match(/\d+/)[0])}">${f}</button>`).join('')}
        </div>
    `;

    document.querySelectorAll('.slot-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentSlot = parseInt(btn.dataset.slot);
            saveData = window.api.readSave(currentSlot);
            location.reload();
        });
    });
}

function startApp() {
    gameData = window.api.gameData();
    const saves = window.api.listSaves();

    if (saves.length === 0) {
        document.getElementById('app').innerHTML = `
            <div id="slot-selector"><p>No save files found in the configured folder.</p></div>
        `;
        return;
    }

    if (saves.length === 1) {
        currentSlot = parseInt(saves[0].match(/\d+/)[0]);
        saveData = window.api.readSave(currentSlot);
        initUi(saveData);
    } else {
        showSlotSelector();
    }
}

if (!window.api.hasConfig()) {
    showSetup();
} else {
    startApp();
}
