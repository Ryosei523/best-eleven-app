// --------- HTML要素を取得 ---------
const spinButton = document.getElementById('spin-button');
const playerSlots = document.querySelectorAll('.player-slot');

// --------- グローバル変数（ゲームの状態を管理） ---------
let allPlayersData = {};
let confirmedSlots = [];
let tempPlayers = {};
let currentGameState = 'ready_to_spin'; // 'ready_to_spin' | 'waiting_for_selection' | 'game_over'

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
    currentGameState = 'game_over'; // ゲーム終了状態に
    } else {
    spinButton.textContent = `残り${11 - confirmedSlots.length}人 ルーレットを回す`;
    }
}