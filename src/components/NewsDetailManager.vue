<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessageBox } from 'element-plus'
import { ArrowLeft, Close, Edit } from '@element-plus/icons-vue'
import { useNewsStore } from '@/stores/useNewsStore'
import NewsForm from '@/components/NewsForm.vue'

const props = defineProps({
  // ドロワーの開閉(v-model)
  modelValue: { type: Boolean, default: false },
  // 表示・編集するお知らせ。null なら新規登録モード。
  news: { type: Object, default: null },
  // 既存データを開いたときの最初のモード('view' | 'edit')
  initialMode: { type: String, default: 'view' },
})

const emit = defineEmits(['update:modelValue', 'saved', 'closed'])
const newsStore = useNewsStore()
const formRef = ref(null)

// 画面に表示しているデータ。保存後は最新の内容に差し替える。
const current = ref(null)
// 'view' | 'edit' | 'create'
const mode = ref('view')

const isView = computed(() => mode.value === 'view')
const isCreate = computed(() => mode.value === 'create')
const saving = computed(() => formRef.value?.saving ?? false)

const title = computed(() => {
  if (isCreate.value) return 'お知らせの新規登録'
  return isView.value ? 'お知らせの詳細' : 'お知らせの編集'
})

// 開くたびにデータとモードを初期化する
watch(
  () => [props.modelValue, props.news],
  ([open]) => {
    if (!open) return
    current.value = props.news ? { ...props.news } : null
    mode.value = props.news?.id != null ? props.initialMode : 'create'
  },
  { immediate: true },
)

// ---- 閉じる処理 -------------------------------------------------
// 未保存の変更があれば確認し、続行してよい場合に true を返す
const confirmDiscard = async () => {
  if (saving.value) return false
  if (isView.value || !formRef.value?.isDirty) return true
  try {
    await ElMessageBox.confirm(
      '保存されていない変更があります。破棄して閉じますか?',
      '確認',
      { type: 'warning', confirmButtonText: '破棄する', cancelButtonText: '編集に戻る' },
    )
    return true
  } catch {
    return false
  }
}

// ESC・右上の×・ヘッダーの戻るボタンなど el-drawer 経由の閉じ方
const beforeClose = async (done) => {
  if (await confirmDiscard()) done()
}

// フッターの「閉じる」ボタンなど
const requestClose = async () => {
  if (await confirmDiscard()) emit('update:modelValue', false)
}

const handleClosed = () => {
  newsStore.clearEditing()
  emit('closed')
}

// ---- モード切替 / 保存 ------------------------------------------
const startEdit = () => {
  mode.value = 'edit'
}

// 編集のキャンセル:既存データは詳細表示に戻り、新規ならドロワーを閉じる
const cancelEdit = async () => {
  if (!(await confirmDiscard())) return
  if (isCreate.value) {
    emit('update:modelValue', false)
  } else {
    mode.value = 'view'
  }
}

const handleSaved = (saved) => {
  emit('saved', saved)
  if (isCreate.value) {
    // 新規登録後は一覧に戻る
    emit('update:modelValue', false)
  } else {
    // 更新後は最新内容で詳細表示に戻る
    current.value = { ...current.value, ...saved }
    mode.value = 'view'
  }
}

// ---- 表示用 ------------------------------------------------------
const formatDate = (value) => {
  if (!value) return '-'
  const [y, m, d] = String(value).split('-')
  return d ? `${y}年${m}月${d}日` : value
}

const statusTagType = (status) => (status === '公開' ? 'success' : 'info')
</script>

<template>
  <el-drawer
    :model-value="modelValue"
    size="100%"
    direction="rtl"
    append-to-body
    destroy-on-close
    :show-close="false"
    :close-on-click-modal="false"
    :before-close="beforeClose"
    class="news-drawer"
    @update:model-value="emit('update:modelValue', $event)"
    @closed="handleClosed"
  >
    <!-- ヘッダー:左に「一覧に戻る」、右に「×」。どちらも常に見える位置にある -->
    <template #header="{ close, titleId, titleClass }">
      <div class="news-drawer__header">
        <el-button :icon="ArrowLeft" @click="close">一覧に戻る</el-button>
        <h2 :id="titleId" :class="[titleClass, 'news-drawer__title']">{{ title }}</h2>
        <el-button :icon="Close" circle aria-label="閉じる" @click="close" />
      </div>
    </template>

    <div class="news-drawer__body">
      <!-- 詳細表示 -->
      <template v-if="isView && current">
        <el-descriptions :column="1" border class="news-drawer__detail">
          <el-descriptions-item label="タイトル">
            <strong>{{ current.title }}</strong>
          </el-descriptions-item>
          <el-descriptions-item label="カテゴリ">
            <el-tag>{{ current.category }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="公開日">
            {{ formatDate(current.publishDate) }}
          </el-descriptions-item>
          <el-descriptions-item label="公開状態">
            <el-tag :type="statusTagType(current.status)">{{ current.status }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="本文">
            <div class="news-drawer__text">{{ current.body }}</div>
          </el-descriptions-item>
        </el-descriptions>
      </template>

      <!-- 編集 / 新規登録(ボタンはフッターに置くので hide-actions) -->
      <NewsForm
        v-else
        ref="formRef"
        :news="current"
        hide-actions
        @saved="handleSaved"
      />
    </div>

    <!-- フッター:ドロワーの下部に固定され、スクロールしても常に押せる -->
    <template #footer>
      <div class="news-drawer__footer">
        <template v-if="isView">
          <el-button type="primary" :icon="Edit" @click="startEdit">編集する</el-button>
          <el-button @click="requestClose">閉じる</el-button>
        </template>
        <template v-else>
          <el-button type="primary" :loading="saving" @click="formRef?.submit()">
            {{ isCreate ? '登録する' : '更新する' }}
          </el-button>
          <el-button :disabled="saving" @click="cancelEdit">キャンセル</el-button>
        </template>
      </div>
    </template>
  </el-drawer>
</template>

<style scoped>
.news-drawer__header {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
}

.news-drawer__title {
  flex: 1;
  margin: 0;
  font-size: 18px;
}

.news-drawer__body {
  /* 全画面でも読みやすいよう、中身は中央寄せ + 最大幅を制限する */
  --news-form-max-width: 880px;
  max-width: 880px;
  margin: 0 auto;
}

.news-drawer__text {
  white-space: pre-wrap; /* 本文の改行をそのまま表示 */
  word-break: break-word;
  line-height: 1.8;
}

.news-drawer__footer {
  display: flex;
  justify-content: center;
  gap: 8px;
}
</style>