<script setup>
import { computed, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Edit, Delete, Close, Document, EditPen, Calendar, Clock } from '@element-plus/icons-vue'
import { useNewsStore } from '@/stores/useNewsStore'
import NewsForm from '@/components/NewsForm.vue'

// 編集・詳細確認・削除 専用のdrawer(新規登録は NewsForm 単体で行う)
const props = defineProps({
  modelValue: { type: Boolean, default: false }, // 開閉(v-model)
})
const emit = defineEmits(['update:modelValue', 'saved', 'deleted', 'closed'])

const newsStore = useNewsStore()

// 表示中のデータ(開いた時点のコピー)
const current = ref(null)

// 'view'(詳細確認) か 'edit'(編集)
const mode = ref('view')

// 削除処理中フラグ
const deleting = ref(false)

const hasNews = computed(() => current.value !== null)

const setMode = (newMode) => {
  mode.value = newMode
}

const close = () => emit('update:modelValue', false)

/* 
 ヘッダー(モードに応じてタイトル・説明・アイコンが切り替わる)
*/
const MODE_HEADERS = {
  view: { title: '詳細確認', icon: Document },
  edit: { title: '編集', icon: EditPen },
}
const header = computed(() => MODE_HEADERS[mode.value])

/* 
 ヘッダーのボタン(モードごとの設定配列を v-for で描画)
*/
const actions = computed(() => {
  const byMode = {
    view: [
      { key: 'edit', label: '編集', type: 'primary', icon: Edit, disabled: !hasNews.value, onClick: () => setMode('edit') },
      { key: 'delete', label: '削除', type: 'danger', icon: Delete, disabled: !hasNews.value, loading: deleting.value, onClick: handleDelete },
      { key: 'close', label: '閉じる', type: 'default', icon: Close, onClick: close },
    ]
  }
  return byMode[mode.value]
})

/* 
  本文エリアの出し分け
*/
const viewItems = computed(() => (hasNews.value && mode.value === 'view' ? [current.value] : []))
const editItems = computed(() => (hasNews.value && mode.value === 'edit' ? [current.value] : []))

/* 
  詳細表示用の整形
*/
// 公開状態 → 表示ラベルと色(未知の値はそのまま表示)
const STATUS_META = {
  published: { label: '公開中', type: 'success' },
  draft: { label: '下書き', type: 'info' },
  private: { label: '非公開', type: 'warning' },
  公開: { label: '公開中', type: 'success' },
  下書き: { label: '下書き', type: 'info' },
  非公開: { label: '非公開', type: 'warning' },
}
const statusOf = (news) => STATUS_META[news.status] ?? { label: news.status || '未設定', type: 'info' }

// 右サイドの記事情報(値があるものだけ並べる)
const infoItemsOf = (news) =>
  [
    { key: 'publishDate', icon: Calendar, label: '公開日', raw: news.publishDate },
    { key: 'updatedAt', icon: Clock, label: '更新日', raw: news.updatedAt },
  ]
    .filter((item) => item.raw)
    .map((item) => ({ ...item, value: newsStore.formatDate(item.raw) }))

const bodyOf = (news) => news.body || '本文は登録されていません'
const bodyClassOf = (news) => ({ 'is-empty': !news.body })

// drawerが開いたら、表示データとモードを初期化
watch(
  () => props.modelValue,
  (isOpen) => {
    if (!isOpen) return
    current.value = newsStore.editingNews ? { ...newsStore.editingNews } : null
    setMode('view')
  },
)

// drawerが閉じ終わったら、編集対象を元に戻す
const handleClosed = () => {
  newsStore.clearEditing()
  emit('closed')
}

// NewsForm で保存できたら、最新の内容で詳細表示に戻る
const handleSaved = (saved) => {
  current.value = { ...current.value, ...saved }
  setMode('view')
  emit('saved', saved)
}

const handleDelete = async () => {
  try {
    await ElMessageBox.confirm('このニュースを削除します。よろしいですか?', '削除の確認', {
      type: 'warning',
      confirmButtonText: '削除する',
      cancelButtonText: 'キャンセル',
    })
  } catch {
    return
  }

  deleting.value = true
  try {
    await newsStore.deleteNews(current.value.id)
    ElMessage.success('削除しました')
    emit('deleted', current.value.id)
    close()
  } catch (e) {
    console.error(e)
    ElMessage.error('削除に失敗しました。もう一度お試しください')
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <el-drawer
    class="news-drawer"
    :model-value="modelValue"
    :title="header.title"
    size="100%"
    append-to-body
    destroy-on-close
    :show-close="false"
    @update:model-value="emit('update:modelValue', $event)"
    @closed="handleClosed"
  >
    <template #header>
      <div class="header">
        <div class="header-main">
          <span class="header-icon">
            <el-icon :size="22"><component :is="header.icon" /></el-icon>
          </span>
          <div class="header-text">
            <h2 class="header-title">{{ header.title }}</h2>
          </div>
        </div>

        <div class="header-actions">
          <el-button
            v-for="action in actions"
            :key="action.key"
            :type="action.type"
            :plain="action.plain"
            :icon="action.icon"
            :disabled="action.disabled"
            :loading="action.loading"
            size="large"
            @click="action.onClick"
          >
            {{ action.label }}
          </el-button>
        </div>
      </div>
    </template>

    <div class="content">
      <!-- 詳細確認 -->
      <div v-for="news in viewItems" :key="news.id" class="detail">
        <article class="article">
          <div class="tags">
            <el-tag effect="plain" round size="large">{{ news.category || '未分類' }}</el-tag>
            <el-tag :type="statusOf(news).type" round size="large">{{ statusOf(news).label }}</el-tag>
          </div>

          <h1 class="article-title">{{ news.title }}</h1>
          <el-divider class="article-divider" />
          <div class="article-body" :class="bodyClassOf(news)">{{ bodyOf(news) }}</div>
        </article>

        <aside class="info">
          <h3 class="info-heading">記事情報</h3>
          <dl class="info-list">
            <div v-for="item in infoItemsOf(news)" :key="item.key" class="info-row">
              <dt class="info-label">
                <el-icon><component :is="item.icon" /></el-icon>
                {{ item.label }}
              </dt>
              <dd class="info-value">{{ item.value }}</dd>
            </div>
          </dl>
        </aside>
      </div>

      <!-- 編集 -->
      <div v-for="news in editItems" :key="news.id" class="edit">
        <NewsForm :news="news" @saved="handleSaved" @cancel="setMode('view')" />
      </div>
    </div>
  </el-drawer>
</template>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px 24px;
  width: 100%;
}

.header-main {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.header-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.header-text {
  min-width: 0;
}

.header-title {
  margin: 0;
  font-size: 20px;
  line-height: 1.3;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.header-actions :deep(.el-button + .el-button) {
  margin-left: 0;
}

/* 本文エリア */
.content {
  min-height: 100%;
  padding: 32px;
  box-sizing: border-box;
}

.empty {
  padding: 80px 0;
}

.detail {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 24px;
  align-items: start;
  max-width: 1280px;
  margin: 0 auto;
}

.article,
.info,
.edit {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
}

.article {
  padding: 48px 56px 64px;
  min-height: 60vh;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
}

.article-title {
  margin: 0;
  font-size: 32px;
  line-height: 1.45;
  font-weight: 700;
  color: var(--el-text-color-primary);
  word-break: break-word;
}

.article-divider {
  margin: 32px 0;
}

.article-body {
  white-space: pre-wrap; /* 本文の改行をそのまま表示 */
  word-break: break-word;
  font-size: 17px;
  line-height: 2;
  color: var(--el-text-color-primary);
}

.article-body.is-empty {
  color: var(--el-text-color-placeholder);
}

/* 右サイド:スクロールしても記事情報が見えるように固定 */
.info {
  position: sticky;
  top: 0;
  padding: 24px;
}

.info-heading {
  margin: 0 0 16px;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin: 0;
}

.info-row {
  padding-bottom: 16px;
  border-bottom: 1px dashed var(--el-border-color-lighter);
}

.info-row:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.info-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.info-value {
  margin: 6px 0 0;
  font-size: 16px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

/* 編集 */
.edit {
  --news-form-max-width: 960px;
  max-width: 1040px;
  margin: 0 auto;
  padding: 40px 48px;
}
</style>