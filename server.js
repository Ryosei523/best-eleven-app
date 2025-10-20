// 1. Expressを読み込む
const express = require('express');
// ✨ Node.jsでファイルを扱うための 'fs' モジュールを読み込む
const fs = require('fs');

// 2. Expressアプリを作成する
const app = express();

// 3. サーバーが待ち受けるポート番号を設定
const port = 3000;

// 4. "public"という名前のフォルダの中身を公開する設定
app.use(express.static('public'));

// ✨✨ ここからが新しいコード ✨✨
// '/api/players' というURLにアクセスがあった時の処理
app.get('/api/players', (req, res) => {
  // players.jsonファイルを読み込む
    fs.readFile('players.json', 'utf8', (err, data) => {
    if (err) {
      // もしエラーがあれば、エラーメッセージを返す
        console.error(err);
        res.status(500).send('サーバーでエラーが発生しました');
        return;
    }
    // 読み込んだデータ（JSON形式の文字列）をオブジェクトに変換して返す
    res.json(JSON.parse(data));
    });
});
// ✨✨ ここまで ✨✨

// 5. サーバーを起動する
app.listen(port, () => {
    console.log(`サーバーが起動しました。 http://localhost:${port} でアクセスできます。`);
});