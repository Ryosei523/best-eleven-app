// --------- HTML要素を取得 ---------
const teamSelector = document.getElementById('team-selector');
const pitch = document.getElementById('pitch');
const slotMachine = document.getElementById('slot-machine');
const playerDisplay = document.getElementById('player-display');
const decideButton = document.getElementById('decide-button');

// --------- グローバル変数 ---------
let allPlayersData = {};
let currentSelectedPlayer = null;
let currentSlotElement = null;

// --------- APIから選手データを取得 ---------
fetch('/api/players')
    .then(response => response.json())
    .then(data => {
    console.log('サーバーから選手データを取得しました！', data);
    allPlayersData = data;
    createTeamDropdown(data);
    })
    .catch(error => {
    console.error('データの取得に失敗しました', error);
    });

// --------- イベントリスナーの設定 ---------

// チーム選択ドロップダウンが変更された時の処理
teamSelector.addEventListener('change', (event) => {
    const selectedTeam = event.target.value;
    if (selectedTeam) {
    pitch.style.display = 'block';
    } else {
    pitch.style.display = 'none';
    }
});

// ポジション枠にクリックイベントを設定
const playerSlots = document.querySelectorAll('.player-slot');
playerSlots.forEach(slot => {
    slot.addEventListener('click', (event) => {
    currentSlotElement = event.target;
    startSlot(currentSlotElement.id);
    });
});

// 「この選手に決定」ボタンがクリックされた時の処理
decideButton.addEventListener('click', () => {
    if (currentSelectedPlayer && currentSlotElement) {
    // ↓ innerHTMLを使って、枠の中にimgタグ（写真）を入れる
    currentSlotElement.innerHTML = `<img class="player-img" src="${currentSelectedPlayer.photo_url}" alt="${currentSelectedPlayer.name}">`;
    slotMachine.style.display = 'none';
    }
});
// --------- 関数 ---------

// チーム選択のドロップダウンを作成する関数
function createTeamDropdown(teams) {
    const teamNames = Object.keys(teams);
    let html = '<select id="team-select">';
    html += '<option value="">チームを選択してください</option>';
    teamNames.forEach(teamKey => {
    const displayName = teamKey.replace(/_/g, ' ').toUpperCase();
    html += `<option value="${teamKey}">${displayName}</option>`;
    });
    html += '</select>';
    teamSelector.innerHTML = html;
}

// =======================================================
// ▼▼▼ ここがアニメーション付きの新しいstartSlot関数です ▼▼▼
// =======================================================
function startSlot(positionId) {
    const selectedTeamKey = document.getElementById('team-select').value;
    if (!selectedTeamKey) {
    alert('最初にチームを選択してください！');
    return;
    }
    
    const position = positionId.split('-')[0].toUpperCase();
    const candidates = allPlayersData[selectedTeamKey].filter(player => player.position === position);
    
    if (candidates.length === 0) {
    alert('このポジションの選手がいません！');
    return;
    }
    
    slotMachine.style.display = 'block';

  // 100ミリ秒ごとに選手名を切り替える処理を開始
    const rotation = setInterval(() => {
    const randomIndex = Math.floor(Math.random() * candidates.length);
    const randomPlayer = candidates[randomIndex];
    playerDisplay.textContent = randomPlayer.name;
    }, 100);

  // 2秒後に回転を停止する処理
    setTimeout(() => {
    clearInterval(rotation);
    
    const finalRandomIndex = Math.floor(Math.random() * candidates.length);
    const finalPlayer = candidates[finalRandomIndex];
    
    currentSelectedPlayer = finalPlayer;
    playerDisplay.textContent = finalPlayer.name;
    }, 2000);
}