import express from 'express'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 呼び出し・書き込み対象のJSON ファイル
const DATA_FILE = path.resolve(__dirname, '../public/news_sample.json')

const PORT = Number(process.env.PORT) || 3001

// クライアントから受け取って保存してよい項目。
// これ以外の項目(id を含む)は無視する。
// → 想定外のデータがファイルに混入するのを防ぎ、id の改ざんも防ぐ。
const EDITABLE_FIELDS = ['title', 'category', 'body', 'publishDate', 'status']

// エラー表現
class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

// JSON ファイルを読み込んで配列として返す処理
// ファイルがまだ無い場合は、空の一覧として扱う(初回の追加で自動作成される)。
const readNews = async () => {
  let text
  try {
    text = await fs.readFile(DATA_FILE, 'utf-8')
  } catch (e) {
    if (e.code === 'ENOENT') return []
    throw e
  }

  const list = JSON.parse(text)
  if (!Array.isArray(list)) {
    throw new HttpError(500, 'news_sample.json の形式が配列ではありません')
  }
  return list
}

/** 
  一覧を JSON ファイルに書き戻す処理
  いきなり本体を上書きすると、書き込み途中でエラーや強制終了が起きた時に
  ファイルが壊れるので「一時ファイル(tmp)に書く → 名前を差し替える」
  という手順にして、本体が中途半端な状態にならないようにしている
**/
const writeNews = async (list) => {
  const tmpFile = `${DATA_FILE}.tmp`
  await fs.writeFile(tmpFile, JSON.stringify(list, null, 2) + '\n', 'utf-8')
  await fs.rename(tmpFile, DATA_FILE)
}


/** 
  排他制御
  「読む → 変更する → 書く」の途中に別のリクエストが割り込むと、
  片方の変更が消えたり、同じ id が二重に採番されたりする。
  そのため、ファイルを書き換える処理は必ず1件ずつ順番に実行している
**/
let queue = Promise.resolve()

const withLock = (task) => {
  const result = queue.then(task)
  // 失敗しても次の処理が止まらないよう、キューには成功扱いで繋ぐ
  queue = result.catch(() => {})
  return result
}

// 入力チェック
const validateNews = (body) => {
  const data = {}
  const errors = []

  for (const field of EDITABLE_FIELDS) {
    const value = body?.[field]
    if (typeof value !== 'string' || value.trim() === '') {
      errors.push(`${field} は必須です`)
    } else {
      data[field] = value.trim()
    }
  }

  if (data.title && data.title.length > 100) {
    errors.push('title は100文字以内で入力してください')
  }
  if (data.body && data.body.length > 2000) {
    errors.push('body は2000文字以内で入力してください')
  }
  if (data.publishDate && !/^\d{4}-\d{2}-\d{2}$/.test(data.publishDate)) {
    errors.push('publishDate は YYYY-MM-DD 形式で指定してください')
  }

  if (errors.length > 0) {
    throw new HttpError(400, errors.join(' / '))
  }
  return data
}

// 新規追加
// id は「現在の最大 id + 1」で採番する
const createNews = (body) =>
  withLock(async () => {
    const data = validateNews(body)
    const list = await readNews()

    const nextId = list.reduce((max, n) => Math.max(max, Number(n.id) || 0), 0) + 1
    // id を先頭に置いて、既存データと項目の並びを揃える
    const created = { id: nextId, ...data }

    list.push(created)
    await writeNews(list)
    return created
  })

// 更新処理
const updateNews = (id, body) =>
  withLock(async () => {
    const data = validateNews(body)
    const list = await readNews()

    const index = list.findIndex((n) => n.id === id)
    if (index === -1) {
      throw new HttpError(404, `id: ${id} のニュースが見つかりません`)
    }

    // 既存の項目を残したまま、編集可能な項目だけを上書きする
    const updated = { ...list[index], ...data, id }
    list[index] = updated
    await writeNews(list)
    return updated
  })

// ルーティング
const app = express()
app.use(express.json({ limit: '1mb' }))

// async 関数内で起きたエラーを、確実にエラー処理へ渡すための包み
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)

// 全件取得
app.get(
  '/api/news',
  asyncHandler(async (req, res) => {
    res.json(await readNews())
  }),
)

// 新規追加
app.post(
  '/api/news',
  asyncHandler(async (req, res) => {
    const created = await createNews(req.body)
    res.status(201).json(created)
  }),
)

// 更新
app.put(
  '/api/news/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      throw new HttpError(400, 'id は整数で指定してください')
    }
    const updated = await updateNews(id, req.body)
    res.json(updated)
  }),
)

// エラー処理
app.use((err, res) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message })
  }
  // 不正な JSON が送られた場合(express.json のエラー)
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'リクエストの JSON が不正です' })
  }
  console.error(err)
  res.status(500).json({ message: 'サーバーでエラーが発生しました' })
})

// 127.0.0.1 のみで待ち受ける。
// このAPIには認証がなく、誰でも書き込めてしまうため、同じネットワークの他の端末からはアクセスできないようにしている。
app.listen(PORT, '127.0.0.1', () => {
  console.log(`News API: http://127.0.0.1:${PORT}  (data: ${DATA_FILE})`)
})