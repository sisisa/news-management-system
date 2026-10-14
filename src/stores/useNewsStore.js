import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import * as newsApi from '@/api/newsApi'

export const useNewsStore = defineStore('news', () => {
  const newsList = ref([])

  // 読み込み状態とエラー
  const loading = ref(false)
  const error = ref(null)

  // 編集中のニュース。null なら「新規登録」モード。
  const editingNews = ref(null)

  // 検索条件
  const keyword = ref('')
  const selectedCategory = ref('')

  // カテゴリ一覧
  const categories = ['お知らせ', 'アップデート', 'イベント']

  // JSONファイルからニュースデータを取得
  const fetchNews = async () => {
    loading.value = true
    error.value = null

    try {  
      const data = await newsApi.fetchNewsList()

      if (!Array.isArray(data)) {
        throw new Error('ニュースデータの形式が正しくありません。')
      }

      newsList.value = data
    } catch (err) {
      error.value = err instanceof Error
        ? err.message
        : '予期しないエラーが発生しました。'
    } finally {
      loading.value = false
    }
  }

  // 検索条件に一致するニュース
  const filteredNews = computed(() => {
    const normalizedKeyword = keyword.value.trim().toLowerCase()

    return newsList.value.filter((news) => {
      const matchesKeyword = String(news.title ?? '')
        .toLowerCase()
        .includes(normalizedKeyword)

      const matchesCategory =
        !selectedCategory.value ||
        news.category === selectedCategory.value

      return matchesKeyword && matchesCategory
    })
  })

  // 検索条件をリセット
  function resetSearch() {
    keyword.value = ''
    selectedCategory.value = ''
  }

  // 新規登録処理
  const addNews = async (news) => {
    const created = await newsApi.createNews(news)
    console.log('news', news)
    console.log('created', created)
    newsList.value.push(created)
    await fetchNews()
    return created
  }

  // 更新処理
  const updateNews = async (news) => {    
    const index = newsList.value.findIndex((n) => n.id === news.id)

    const { id, ...fields } = news
    const updated = await newsApi.updateNews(id, fields)
    newsList.value[index] = updated

    console.log('news', news)
    console.log('updated', updated)

    console.log('index', index)
    if (index === -1) {
      throw new Error(`更新対象が見つかりません (id: ${news.id})`)
    }
    newsList.value[index] = { ...newsList.value[index], ...news }
  }

  // 編集開始。一覧の行データを直接渡すのではなく、コピーを持たせる→ 保存前にフォームを書き換えても、一覧の表示が先に変わってしまわない。
  const startEdit = (id) => {
    const target = newsList.value.find((n) => n.id === id)
    editingNews.value = target ? { ...target } : null
  }

  // 編集状態を破棄して「新規登録」モードに戻す。
  const clearEditing = () => {
    editingNews.value = null
  }

  return {
    newsList,
    editingNews,
    error,
    keyword,
    selectedCategory,
    categories,
    filteredNews,
    fetchNews,
    resetSearch,
    addNews,
    updateNews,
    startEdit,
    clearEditing,
  }
})