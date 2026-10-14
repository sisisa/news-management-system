const API_BASE = '/api/news'

// 共通の通信処理
const request = async (url, { body, ...options } = {}) => {
  const res = await fetch(url, {
    ...options,
    // body がある時だけ JSON として送る
    ...(body !== undefined && {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  })

  if (!res.ok) {
    let message = `通信に失敗しました (${res.status})`
    try {
      const data = await res.json()
      if (data?.message) message = data.message
    } catch {
      // 本文が JSON でない場合は、既定のメッセージのまま使う
    }
    throw new Error(message)
  }

  return res.json()
}

// 一覧の取得
export const fetchNewsList = () =>
  request('/news_sample.json', { cache: 'no-store' })

// 新規追加
export const createNews = (news) =>
  request(API_BASE, { method: 'POST', body: news })

// 更新
export const updateNews = (id, news) =>
  request(`${API_BASE}/${id}`, { method: 'PUT', body: news })


// 削除処理
export const deleteNews = (id) =>
  request(`${API_BASE}/${id}`, { method: 'DELETE' })