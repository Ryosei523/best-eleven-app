// --------- HTML要素を取得 ---------
const spinButton = document.getElementById('spin-button');
const playerSlots = document.querySelectorAll('.player-slot');
const saveTeamButton = document.getElementById('save-team-button');
// (マイページ機能で追加する要素)
const myPageButton = document.getElementById('my-page-button'); 
const myTeamsContainer = document.getElementById('my-teams-container');
const logoutButton = document.getElementById('logout-button');
// (認証機能で追加する要素)
const authMessage = document.getElementById('auth-message'); 

// --------- グローバル変数（ゲームの状態を管理） ---------
let allPlayersData = {};
let confirmedSlots = [];
let tempPlayers = {};
let currentGameState = 'ready_to_spin'; 
let confirmedPlayerIds = {};

// --------- 初期化：APIから選手データを取得 ---------
fetch('/api/players')
  .then(response => response.json())
  .then(data => {
    console.log('ポジション別の選手データを取得しました', data);
    allPlayersData = data;
    spinButton.textContent = 'ルーレットを回す';
    spinButton.disabled = false;
    // 初期のポジション名表示
    playerSlots.forEach(slot => {
      const positionId = slot.id;
      slot.innerHTML = getDisplayPositionName(positionId);
    });
  })
  .catch(error => {
    console.error('データの取得に失敗しました', error);
    spinButton.textContent = 'エラーが発生しました';
    spinButton.disabled = true;
  });

// --------- ゲーム進行のイベントリスナー ---------

spinButton.addEventListener('click', () => {
  if (currentGameState !== 'ready_to_spin') return;
  
  if (confirmedSlots.length === 12) {
    alert('ベストイレブンが完成しました！おめでとうございます！');
    currentGameState = 'game_over'; 
    spinButton.disabled = true;
    spinButton.textContent = 'ゲーム終了';
    return;
  }

  currentGameState = 'waiting_for_selection';
  spinButton.textContent = '1人を選択してください...';
  spinButton.disabled = true;

  spinAllSlots();
});

playerSlots.forEach(slot => {
  slot.addEventListener('click', () => {
    if (currentGameState !== 'waiting_for_selection') return;

    const positionId = slot.id;
    
    // すでに確定済みの枠をクリックしても何もしない
    if (confirmedSlots.includes(positionId)) return;
    
    // 選手を選択し、そのポジションを「確定」する
    selectPlayer(positionId);
  });
});

// --------- コア関数 ---------

function getDisplayPositionName(positionId) {
  if (positionId === 'gk') return 'GK';
  if (positionId.startsWith('df')) return 'DF';
  if (positionId.startsWith('dmf')) return 'DMF'; 
  if (positionId.startsWith('amf')) return 'AMF'; 
  if (positionId.startsWith('fw')) return 'FW';
  if (positionId === 'manager') return 'Coach';
  return '';
}

function spinAllSlots() {
  tempPlayers = {}; 

  playerSlots.forEach(slot => {
    const positionId = slot.id;

    if (!confirmedSlots.includes(positionId)) {
      let count = 0;
      const candidates = allPlayersData[positionId];
      if (!candidates || candidates.length === 0) {
        slot.innerHTML = `<div class="player-name-display" style="color:red;">選手なし</div>`;
        return;
      }

      const interval = setInterval(() => {
        const randomIndex = Math.floor(Math.random() * candidates.length);
        const player = candidates[randomIndex];
        slot.innerHTML = `<img class="player-img" src="${player.photo_url}" alt="${player.name}">
                          <div class="player-name-display">${player.name}</div>`;
        count++;
        if (count > 10) { 
          clearInterval(interval);
          const finalRandomIndex = Math.floor(Math.random() * candidates.length);
          const finalPlayer = candidates[finalRandomIndex];
          tempPlayers[positionId] = finalPlayer;
          slot.innerHTML = `<img class="player-img" src="${finalPlayer.photo_url}" alt="${finalPlayer.name}">
                            <div class="player-name-display">${finalPlayer.name}</div>`;
          slot.classList.add('ready-to-select'); 
        }
      }, 100);
    }
  });
}

function selectPlayer(positionId) {
  confirmedSlots.push(positionId);
  const selectedSlot = document.getElementById(positionId);
  const selectedPlayer = tempPlayers[positionId];
  
  confirmedPlayerIds[positionId + '_player_id'] = selectedPlayer.id;

  selectedSlot.innerHTML = `<img class="player-img" src="${selectedPlayer.photo_url}" alt="${selectedPlayer.name}">
                            <div class="player-name-display">${selectedPlayer.name}</div>`;
  selectedSlot.classList.add('confirmed'); 
  selectedSlot.classList.remove('ready-to-select');

  playerSlots.forEach(slot => {
    const id = slot.id;
    if (!confirmedSlots.includes(id)) {
      slot.innerHTML = getDisplayPositionName(id);
      slot.classList.remove('ready-to-select');
    }
  });

  currentGameState = 'ready_to_spin';
  spinButton.disabled = false;
  
  if (confirmedSlots.length === 12) {
    spinButton.textContent = 'ベストイレブン完成！';
    currentGameState = 'game_over'; 
    saveTeamButton.style.display = 'block';
  } else {
    spinButton.textContent = `残り${12 - confirmedSlots.length}人 ルーレットを回す`;
  }
}

// --------- 認証機能 ---------
const registerUsernameInput = document.getElementById('register-username');
const registerPasswordInput = document.getElementById('register-password');
const registerButton = document.getElementById('register-button');

const loginUsernameInput = document.getElementById('login-username');
const loginPasswordInput = document.getElementById('login-password');
const loginButton = document.getElementById('login-button');

registerButton.addEventListener('click', async () => {
  const username = registerUsernameInput.value;
  const password = registerPasswordInput.value;

  const response = await fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  const result = await response.json();
  authMessage.textContent = result.message; 
});

loginButton.addEventListener('click', async () => {
  const username = loginUsernameInput.value;
  const password = loginPasswordInput.value;

  const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  const result = await response.json();

  if (result.success) {
    console.log('ログイン成功！');
    authMessage.textContent = result.message; 
    myPageButton.style.display = 'inline-block'; 
    logoutButton.style.display = 'inline-block'; 
    document.getElementById('auth-container').style.display = 'none'; 
  } else {
    authMessage.textContent = result.message;
  }
});

// --------- チーム保存機能 ---------
saveTeamButton.addEventListener('click', async () => {
  const teamData = {
    gk_player_id: confirmedPlayerIds['gk_player_id'],
    df_right_player_id: confirmedPlayerIds['df-right_player_id'],
    df_center_right_player_id: confirmedPlayerIds['df-center-right_player_id'],
    df_center_left_player_id: confirmedPlayerIds['df-center-left_player_id'],
    df_left_player_id: confirmedPlayerIds['df-left_player_id'],
    dmf_right_player_id: confirmedPlayerIds['dmf-right_player_id'],
    dmf_left_player_id: confirmedPlayerIds['dmf-left_player_id'],
    amf_right_player_id: confirmedPlayerIds['amf-right_player_id'],
    amf_center_player_id: confirmedPlayerIds['amf-center_player_id'],
    amf_left_player_id: confirmedPlayerIds['amf-left_player_id'],
    fw_center_player_id: confirmedPlayerIds['fw-center_player_id'],
    manager_id: confirmedPlayerIds['manager_player_id']
  };

  const response = await fetch('/api/save_team', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(teamData)
  });

  const result = await response.json();
  alert(result.message); 
  saveTeamButton.disabled = true; 
});

// --------- マイページ機能 ---------
function findPlayerName(positionKey, playerId) {
  const playersInPosition = allPlayersData[positionKey];
  if (!playersInPosition) return '不明';
  const foundPlayer = playersInPosition.find(p => p.id === playerId);
  return foundPlayer ? foundPlayer.name : '不明';
}

myPageButton.addEventListener('click', async () => {
  const response = await fetch('/api/my_teams');
  const result = await response.json(); // ★ここがエラーの原因でした（修正済み）

  if (!result.success) {
    alert(result.message);
    return;
  }

  myTeamsContainer.innerHTML = '<h3>保存したチーム一覧</h3>';
  
  if (result.teams.length === 0) {
    myTeamsContainer.innerHTML += '<p>保存されたチームはありません。</p>';
    return;
  }

  result.teams.forEach(team => {
    const gkName = findPlayerName('gk', team.gk_player_id);
    const fwName = findPlayerName('fw-center', team.fw_center_player_id);

    myTeamsContainer.innerHTML += `
      <div style="border: 1px solid #ccc; padding: 10px; margin-bottom: 10px; cursor: pointer; background: #fff;"
          onclick="loadTeam(${team.team_id})">
        <div style="font-weight: bold; color: #007bff;">チームID: ${team.team_id}</div>
        <div style="font-size: 0.9rem; color: #555;">
          GK: ${gkName} / FW: ${fwName}
        </div>
        <div style="font-size: 0.8rem; color: #888;">(クリックして配置する)</div>
      </div>
      <button onclick="deleteTeam(${team.team_id})" 
              style="background-color: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; font-size: 0.8rem; margin-bottom: 10px;">
        削除
      </button>
    `;
  });
});

async function loadTeam(teamId) {
  const response = await fetch(`/api/get_team_details/${teamId}`);
  const result = await response.json();

  if (result.success) {
    displayTeamOnPitch(result.players);
  } else {
    alert(result.message);
  }
}

function displayTeamOnPitch(players) {
  playerSlots.forEach(slot => {
    slot.innerHTML = getDisplayPositionName(slot.id);
    slot.classList.remove('confirmed');
    slot.style.border = '1px dashed #fff';
  });

  players.forEach(player => {
    const positionId = player.position; 
    const slot = document.getElementById(positionId);
    
    if (slot) {
      slot.innerHTML = `
        <img class="player-img" src="${player.photo_url}" alt="${player.name}">
        <div class="player-name-display">${player.name}</div>
      `;
      slot.classList.add('confirmed'); 
    }
  });

  spinButton.textContent = 'ベストイレブン（保存済）';
  spinButton.disabled = true;
  saveTeamButton.style.display = 'none'; 
}

// --------- ログアウト機能 ---------
logoutButton.addEventListener('click', async () => {
  const response = await fetch('/api/logout', { method: 'POST' });
  const result = await response.json(); // ★ここがエラーの原因でした（修正済み）

  if (result.success) {
    alert(result.message);
    window.location.reload(); 
  } else {
    alert('ログアウトに失敗しました');
  }
});
/**
 * チームを削除する関数
 */
async function deleteTeam(teamId) {
  // 確認ダイアログを出す
  if (!confirm('本当にこのチームを削除しますか？')) {
    return;
  }

  const response = await fetch('/api/delete_team', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ team_id: teamId })
  });

  const result = await response.json();
  
  if (result.success) {
    alert(result.message);
    // マイページを再読み込みして、一覧を更新する
    myPageButton.click(); 
  } else {
    alert(result.message);
  }
}