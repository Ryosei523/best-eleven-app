// --------- HTML要素を取得 ---------
const spinButton = document.getElementById('spin-button');
const playerSlots = document.querySelectorAll('.player-slot');
const saveTeamButton = document.getElementById('save-team-button');
const authMessage = document.getElementById('auth-message'); 
// (マイページ機能で追加する要素)
const myPageButton = document.getElementById('my-page-button'); 
const myTeamsContainer = document.getElementById('my-teams-container');

// --------- グローバル変数（ゲームの状態を管理） ---------
let allPlayersData = {};
let confirmedSlots = [];
let tempPlayers = {};
let currentGameState = 'ready_to_spin'; // 'ready_to_spin' | 'waiting_for_selection' | 'game_over'
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
        // idからポジション名を整形して表示 (例: fw-left -> FW)
        slot.innerHTML = getDisplayPositionName(positionId);
    });
    })
    .catch(error => {
    console.error('データの取得に失敗しました', error);
    spinButton.textContent = 'エラーが発生しました';
    spinButton.disabled = true;
    });

// --------- イベントリスナー ---------

spinButton.addEventListener('click', () => {
    if (currentGameState !== 'ready_to_spin') return;
    
    if (confirmedSlots.length === 11) {
    alert('ベストイレブンが完成しました！おめでとうございます！');
    currentGameState = 'game_over'; // ゲーム終了状態に
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

/**
 * HTMLのidから表示用のポジション名を取得するヘルパー関数
 */
function getDisplayPositionName(positionId) {
    if (positionId === 'gk') return 'GK';
    if (positionId.startsWith('df')) return 'DF';
    if (positionId.startsWith('dmf')) return 'DMF'; // 守備的MF
    if (positionId.startsWith('amf')) return 'AMF'; // 攻撃的MF
    if (positionId.startsWith('fw')) return 'FW';
    return '';
}

/**
 * 未確定の全スロットをルーレットし、仮表示する関数
 */
function spinAllSlots() {
    tempPlayers = {}; 

    playerSlots.forEach(slot => {
    const positionId = slot.id;

    if (!confirmedSlots.includes(positionId)) {
      // ルーレット中のアニメーション表示（簡易版）
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
        // 1秒間（100ms * 10回）回転したら止める
        if (count > 10) { 
            clearInterval(interval);
            // 最終的な選手を確定し仮表示
            const finalRandomIndex = Math.floor(Math.random() * candidates.length);
            const finalPlayer = candidates[finalRandomIndex];
            tempPlayers[positionId] = finalPlayer;
            slot.innerHTML = `<img class="player-img" src="${finalPlayer.photo_url}" alt="${finalPlayer.name}">
                                <div class="player-name-display">${finalPlayer.name}</div>`;
            slot.classList.add('ready-to-select'); // 選択可能状態のクラスを追加
        }
        }, 100);
    }
    });
}

/**
 * 選手を1人選択し、他をリセットする関数
 * @param {string} positionId - 選択されたポジションのID (例: 'gk')
 */
function selectPlayer(positionId) {
  // 1. 選択した枠を「確定」状態にする
    confirmedSlots.push(positionId);
    const selectedSlot = document.getElementById(positionId);
    const selectedPlayer = tempPlayers[positionId];
    
    confirmedPlayerIds[positionId + '_player_id'] = selectedPlayer.id;
  // 確定表示
    selectedSlot.innerHTML = `<img class="player-img" src="${selectedPlayer.photo_url}" alt="${selectedPlayer.name}">
                            <div class="player-name-display">${selectedPlayer.name}</div>`;
    selectedSlot.classList.add('confirmed'); // 確定クラスを追加
    selectedSlot.classList.remove('ready-to-select');

  // 2. 他のすべての「未確定」枠をリセットする
    playerSlots.forEach(slot => {
    const id = slot.id;
    // 確定済み *でない* 枠だけをリセット
    if (!confirmedSlots.includes(id)) {
        slot.innerHTML = getDisplayPositionName(id);
        slot.classList.remove('ready-to-select');
      // ↓↓↓ バグの原因だったインラインスタイル設定を削除 ↓↓↓
      // slot.style.backgroundColor = ''; 
      // slot.style.border = ''; 
    }
    });

  // 3. ゲームの状態を「ルーレット待ち」に戻す
    currentGameState = 'ready_to_spin';
    spinButton.disabled = false;
    
    if (confirmedSlots.length === 11) {
    spinButton.textContent = 'ベストイレブン完成！';
    currentGameState = 'game_over'; 
    saveTeamButton.style.display = 'block';
    // ゲーム終了状態に
    } else {
    spinButton.textContent = `残り${11 - confirmedSlots.length}人 ルーレットを回す`;
    }
}

// --------- 認証機能のHTML要素を取得 ---------
const registerUsernameInput = document.getElementById('register-username');
const registerPasswordInput = document.getElementById('register-password');
const registerButton = document.getElementById('register-button');

const loginUsernameInput = document.getElementById('login-username');
const loginPasswordInput = document.getElementById('login-password');
const loginButton = document.getElementById('login-button');

// --------- 新規登録ボタンのイベント ---------
registerButton.addEventListener('click', async () => {
  const username = registerUsernameInput.value;
  const password = registerPasswordInput.value;

  // サーバーの /api/register にデータを送信
  const response = await fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  const result = await response.json();
  authMessage.textContent = result.message; // 結果を画面に表示
});

// --------- ログインボタンのイベント ---------
loginButton.addEventListener('click', async () => {
  const username = loginUsernameInput.value;
  const password = loginPasswordInput.value;

  // サーバーの /api/login にデータを送信
  const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  const result = await response.json();
  // authMessage.textContent = result.message; // ← 成功/失敗の両方で設定するので、ここで1回だけ設定するのが良い

  if (result.success) {
    // ログインに成功したら
    console.log('ログイン成功！');
    authMessage.textContent = result.message; // 「ようこそ、〇〇さん！」
    myPageButton.style.display = 'block'; // マイページボタンを表示
    document.getElementById('auth-container').style.display = 'none'; // ログインフォームを隠す
  } else {
    // ログインに失敗したら
    authMessage.textContent = result.message; // 「パスワードが違います」など
  }
  // document.getElementById('auth-container').style.display = 'none'; // ← このコメントは不要
}); // ← ★★★ 閉じる括弧 ); は、ここが正しい位置です ★★★

saveTeamButton.addEventListener('click', async () => {
  // 確定した11人の選手ID (confirmedPlayerIds) をサーバーに送る
  
  // サーバーが要求する形式に名前を合わせる
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
    fw_center_player_id: confirmedPlayerIds['fw-center_player_id']
  };

  const response = await fetch('/api/save_team', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(teamData)
  });

  const result = await response.json();
  alert(result.message); // 「チームが保存されました！」とアラート表示
  saveTeamButton.disabled = true; // 2回押せないようにする
});

myPageButton.addEventListener('click', async () => {
  // サーバーに /api/my_teams をリクエスト
  const response = await fetch('/api/my_teams');
  const result = await response.json();

  if (!result.success) {
    alert(result.message);
    return;
  }

  // 取得したチーム一覧(result.teams)を使ってHTMLを組み立てる
  myTeamsContainer.innerHTML = '<h3>保存したチーム一覧</h3>';
  
  if (result.teams.length === 0) {
    myTeamsContainer.innerHTML += '<p>保存されたチームはありません。</p>';
    return;
  }

  // チームごとに「クリックできる」ボタンを作成
  result.teams.forEach(team => {
    myTeamsContainer.innerHTML += `
      <div style="border: 1px solid #ccc; padding: 10px; margin-bottom: 10px; cursor: pointer;"
            onclick="loadTeam(${team.team_id})">
        <p>チームID: ${team.team_id} (クリックして表示)</p>
      </div>
    `;
  });
});

/**
 * * チームIDをクリックしたときにサーバーから選手詳細を取得する関数
 */
async function loadTeam(teamId) {
  const response = await fetch(`/api/get_team_details/${teamId}`);
  const result = await response.json();

  if (result.success) {
    // 取得した11人の選手情報を使ってピッチに表示する
    displayTeamOnPitch(result.players);
  } else {
    alert(result.message);
  }
}

/**
 * * 11人の選手情報 (配列) をピッチに再現する関数
 */
function displayTeamOnPitch(players) {
  // 1. まず全スロットを初期状態（"GK", "FW"など）に戻す
  playerSlots.forEach(slot => {
    slot.innerHTML = getDisplayPositionName(slot.id);
    slot.classList.remove('confirmed');
    slot.style.border = '1px dashed #fff';
  });

  // 2. 11人の選手をそれぞれのポジションに配置する
  players.forEach(player => {
    const positionId = player.position; // "gk", "df-right" など
    const slot = document.getElementById(positionId);
    
    if (slot) {
      // 確定表示
      slot.innerHTML = `
        <img class="player-img" src="${player.photo_url}" alt="${player.name}">
        <div class="player-name-display">${player.name}</div>
      `;
      slot.classList.add('confirmed'); // 確定スタイルを適用
    }
  });

  // 3. ゲームのボタンを「完成状態」にする
  spinButton.textContent = 'ベストイレブン（保存済）';
  spinButton.disabled = true;
  saveTeamButton.style.display = 'none'; // 保存ボタンを隠す
}