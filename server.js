const express = require('express');
const mysql = require('mysql'); // 1. mysqlパッケージを読み込む
const app = express();
const port = 3000;

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

// 4. APIの処理を「players.json」から「MySQL」に書き換える
app.get('/api/players', (req, res) => {
  
  // "players"テーブルから全ての選手データを取得するSQLクエリ
  const sql = 'SELECT * FROM players';

  connection.query(sql, (err, results) => {
    if (err) {
      console.error('データの取得に失敗しました: ', err);
      res.status(500).send('サーバーでエラーが発生しました');
      return;
    }

    // ★重要：フロントエンドが使いやすいようにデータを整形
    // データベースから取得したデータ(results)は平坦な配列です。
    // これを、ポジション別にグループ分けしたオブジェクトに変換します。
    const playersByPosition = {};

    results.forEach(player => {
      const position = player.position; // "gk" や "df-right" など
      if (!playersByPosition[position]) {
        playersByPosition[position] = []; // 新しいポジションの配列を作成
      }
      playersByPosition[position].push(player); // 選手を該当の配列に追加
    });

    // 整形したデータ（players.jsonと同じ形式になったもの）をフロントエンドに返す
    res.json(playersByPosition);
  });
});

app.listen(port, () => {
  console.log(`サーバーが起動しました。 http://localhost:${port} でアクセスできます。`);
});