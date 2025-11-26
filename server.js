const express = require('express');
const mysql = require('mysql'); // 1. mysqlパッケージを読み込む
const app = express();
const port = 3000;
const bcrypt = require('bcrypt');
const session = require('express-session');
app.use(express.json()); // ★重要：JSONデータを読み込むための設定


// 2. MySQLデータベースへの接続情報
const connection = mysql.createConnection({
  host: 'localhost', // あなたのPC
  user: 'root',      // XAMPPのデフォルトユーザー名
  password: '',    // XAMPPのデフォルトパスワード（空）
  database: 'best_eleven_db' // 先ほど作成したデータベース名
});

// 3. データベースに接続
connection.connect((err) => {
  if (err) {
    console.error('データベースへの接続に失敗しました: ', err);
    return;
  }
  console.log('データベースに正常に接続しました。');
});

app.use(express.static('public'));

app.use(session({
  secret: 'my_secret_key', // 秘密鍵（何でも良いですが、実際は複雑な文字列にします）
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // （ローカル開発用）
}));

app.get('/api/players', (req, res) => {
  // playersテーブルに、positionsとclubsを結合するSQL
  const sql = `
    SELECT 
      p.id, p.name, p.photo_url,
      pos.position_name AS position,  -- position_id を名前に変換
      c.club_name
    FROM players p
    JOIN positions pos ON p.position_id = pos.position_id
    LEFT JOIN clubs c ON p.club_id = c.club_id
  `;

  connection.query(sql, (err, results) => {
    // ... (エラー処理) ...
    
    // 整形処理 (playersByPositionを作る)
    const playersByPosition = {};
    results.forEach(player => {
      // SQLで取得した position_name ("gk"など) をキーにする
      const pos = player.position; 
      if (!playersByPosition[pos]) playersByPosition[pos] = [];
      playersByPosition[pos].push(player);
    });
    
    res.json(playersByPosition);
  });
});

app.post('/api/register', (req, res) => {
  const { username, password } = req.body; // HTMLからのデータを取得
  const saltRounds = 10; // 暗号化の強度

  // パスワードを暗号化（ハッシュ化）
  bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) {
      console.error('ハッシュ化エラー:', err);
      return res.status(500).json({ success: false, message: 'サーバーエラー' });
    }

    // 暗号化したパスワード(hash)をusersテーブルに保存
    const sql = "INSERT INTO users (username, password_hash) VALUES (?, ?)";
    connection.query(sql, [username, hash], (err, results) => {
      if (err) {
        // ユーザー名が重複した場合など
        console.error('DB挿入エラー:', err);
        return res.status(400).json({ success: false, message: 'ユーザー名が既に使用されています' });
      }
      res.json({ success: true, message: '登録が完了しました！' });
    });
  });
});

// =======================================================
// ▼▼▼ 3. ログインAPI (/api/login) ▼▼▼
// =======================================================
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  // 1. ユーザー名で探す
  const sql = "SELECT * FROM users WHERE username = ?";
  connection.query(sql, [username], (err, results) => {
    if (err || results.length === 0) {
      // ユーザーが見つからない
      return res.status(401).json({ success: false, message: 'ユーザー名またはパスワードが違います' });
    }

    const user = results[0]; // 見つかったユーザー情報

    // 2. パスワードを比較する
    bcrypt.compare(password, user.password_hash, (err, isMatch) => {
      if (isMatch) {
        req.session.userId = user.user_id; // ★セッションにユーザーIDを保存
        req.session.username = user.username; // ★セッションにユーザー名を保存
        
        res.json({ success: true, message: `ようこそ、${user.username}さん！` });
      } else {
        // パスワードが違う
        res.status(401).json({ success: false, message: 'ユーザー名またはパスワードが違います' });
      }
    });
  });
});
// =======================================================
// ▼▼▼ 4. チーム保存API (/api/save_team) ▼▼▼
// =======================================================
app.post('/api/save_team', (req, res) => {
  
  // ▼▼▼ この部分を修正しました ▼▼▼
  if (!req.session.userId) {
    // もしログインしていなかったら、エラーを返す
    return res.status(401).json({ success: false, message: 'ログインしてください' });
  }
  // セッションからログイン中のIDを取得
  const userId = req.session.userId; 
  // ▲▲▲ const userId = 1; は削除 ▲▲▲

  // script.js から送られてきた11人の選手ID
  const {
    gk_player_id, df_right_player_id, df_center_right_player_id,
    df_center_left_player_id, df_left_player_id, dmf_right_player_id,
    dmf_left_player_id, amf_right_player_id, amf_center_player_id,
    amf_left_player_id, fw_center_player_id, manager_id
  } = req.body;

  const sql = `
    INSERT INTO saved_teams 
    (user_id, gk_player_id, df_right_player_id, df_center_right_player_id, 
      df_center_left_player_id, df_left_player_id, dmf_right_player_id, 
      dmf_left_player_id, amf_right_player_id, amf_center_player_id, 
      amf_left_player_id, fw_center_player_id,manager_id) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const values = [
    userId, // ここがセッションから取得したIDになります
    gk_player_id, df_right_player_id, df_center_right_player_id,
    df_center_left_player_id, df_left_player_id, dmf_right_player_id,
    dmf_left_player_id, amf_right_player_id, amf_center_player_id,
    amf_left_player_id, fw_center_player_id,manager_id
  ];

  connection.query(sql, values, (err, results) => {
    if (err) {
      console.error('チーム保存エラー:', err);
      return res.status(500).json({ success: false, message: '保存に失敗しました' });
    }
    res.json({ success: true, message: 'チームが保存されました！' });
  });
});

app.get('/api/my_teams', (req, res) => {
  // ログインしていない場合はエラー
  if (!req.session.userId) {
    return res.status(401).json({ success: false, message: 'ログインしてください' });
  }
  
  const userId = req.session.userId; // ログイン中のユーザーID

  // saved_teamsテーブルから、そのユーザーIDのチームを全部探す
  const sql = "SELECT * FROM saved_teams WHERE user_id = ?";
  
  connection.query(sql, [userId], (err, results) => {
    if (err) {
      console.error('マイチーム取得エラー:', err);
      return res.status(500).json({ success: false, message: 'チームの読込に失敗しました' });
    }
    
    // 取得したチーム一覧 (results) をフロントエンドに送る
    res.json({ success: true, teams: results });
  });
});
app.get('/api/get_team_details/:team_id', async (req, res) => {
  const teamId = req.params.team_id; // URLから team_id を取得

  // 1. saved_teamsテーブルから、該当するチームの「11人の選手ID」を取得
  const sqlGetIds = "SELECT * FROM saved_teams WHERE team_id = ?";
  
  connection.query(sqlGetIds, [teamId], (err, teamResults) => {
    if (err || teamResults.length === 0) {
      return res.status(404).json({ success: false, message: 'チームが見つかりません' });
    }
    
    const team = teamResults[0];
    
    // 2. 取得した11個の選手IDを配列にまとめる
    const playerIds = [
      team.gk_player_id, team.df_right_player_id, team.df_center_right_player_id,
      team.df_center_left_player_id, team.df_left_player_id, team.dmf_right_player_id,
      team.dmf_left_player_id, team.amf_right_player_id, team.amf_center_player_id,
      team.amf_left_player_id, team.fw_center_player_id,manager_id
    ];

    // 3. playersテーブルから、その11人全員の「選手情報」を取得
    const sqlGetPlayers = "SELECT * FROM players WHERE id IN (?)";
    
    connection.query(sqlGetPlayers, [playerIds], (err, players) => {
      if (err) {
        console.error('選手情報の取得エラー:', err);
        return res.status(500).json({ success: false, message: '選手情報の取得に失敗' });
      }
      
      // 11人の選手情報 ( [{name: '...'}, {name: '...'}, ...] ) を返す
      res.json({ success: true, players: players });
    });
  });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'ログアウト失敗' });
    }
    res.json({ success: true, message: 'ログアウトしました' });
  });
});

// ▼▼▼ 8. チーム削除API (/api/delete_team) ▼▼▼
// =======================================================
app.post('/api/delete_team', (req, res) => {
  // ログインチェック
  if (!req.session.userId) {
    return res.status(401).json({ success: false, message: 'ログインしてください' });
  }
  
  const userId = req.session.userId;
  const { team_id } = req.body; // 削除したいチームのID

  // 自分のチームだけ削除できるように、user_id も条件に含める
  const sql = "DELETE FROM saved_teams WHERE team_id = ? AND user_id = ?";
  
  connection.query(sql, [team_id, userId], (err, result) => {
    if (err) {
      console.error('チーム削除エラー:', err);
      return res.status(500).json({ success: false, message: '削除に失敗しました' });
    }
    
    // 削除された行数が0なら、他人のチームを消そうとしたか、既にない
    if (result.affectedRows === 0) {
        return res.status(403).json({ success: false, message: '削除できませんでした（権限がないか、既に削除されています）' });
    }

    res.json({ success: true, message: 'チームを削除しました' });
  });
});

app.listen(port, () => {
  console.log(`サーバーが起動しました。 http://localhost:${port} でアクセスできます。`);
});