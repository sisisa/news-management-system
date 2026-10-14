<script setup>
import { ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Edit, Delete } from '@element-plus/icons-vue'
import { useNewsStore } from '@/stores/useNewsStore'
import NewsForm from '@/components/NewsForm.vue'

// 編集・詳細確認・削除 専用のドロワー(新規登録は NewsForm 単体で行う)
const props = defineProps({
  modelValue: { type: Boolean, default: false }, // 開閉(v-model)
})
const emit = defineEmits(['update:modelValue', 'saved', 'deleted', 'closed'])

const newsStore = useNewsStore()

// 表示中のデータ(開いた時点のコピー)
const current = ref(null)

// 'view'(詳細) か 'edit'(編集)を示すステータス
const mode = ref('view')

// 削除処理中フラグ
const deleting = ref(false)

// モードを切り替え、タイトルも一緒に変える
const setMode = (newMode) => {
  mode.value = newMode
}

// ドロワーが開いたら、表示データとモードを初期化する
watch(
  () => props.modelValue,
  (isOpen) => {
    if (!isOpen) return
    current.value = newsStore.editingNews ? { ...newsStore.editingNews } : null
    setMode('view')
  },
)

// ドロワーが閉じ終わったら、編集対象とタイトルを元に戻す
const handleClosed = () => {
  newsStore.clearEditing()
  emit('closed')
}

const close = () => {
  emit('update:modelValue', false)
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
    console.log('current.value.id',current.value.id)
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
    :model-value="modelValue"
    size="100%"
    append-to-body
    destroy-on-close
    :show-close="false"
    @update:model-value="emit('update:modelValue', $event)"
    @closed="handleClosed"
  >
    <template #header>
      <div class="header">
        <el-button type="primary" :icon="Edit" @click="setMode('edit')">編集する</el-button>
        <el-button type="danger" :icon="Delete" :loading="deleting" @click="handleDelete">
          削除する
        </el-button>
        <el-button @click="close">閉じる</el-button>
      </div>
    </template>

    <div class="body">
      <el-empty v-if="!current" description="対象のニュースが見つかりません" />

      <!-- 詳細表示 -->
      <el-descriptions v-else-if="mode === 'view'" :column="1" border>
        <el-descriptions-item label="タイトル">{{ current.title }}</el-descriptions-item>
        <el-descriptions-item label="カテゴリ">{{ current.category }}</el-descriptions-item>
        <el-descriptions-item label="公開日">{{ newsStore.formatDate(current.publishDate) }}</el-descriptions-item>
        <el-descriptions-item label="公開状態">{{ current.status }}</el-descriptions-item>
        <el-descriptions-item label="本文">
          <div class="text">{{ current.body }}</div>
        </el-descriptions-item>
      </el-descriptions>

      <!-- 編集(更新・キャンセルボタンは NewsForm の中にある) -->
      <NewsForm
        v-else
        :news="current"
        @saved="handleSaved"
        @cancel="setMode('view')"
      />
    </div>
  </el-drawer>
</template>

<style scoped>
.header {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
}

.title {
  flex: 1;
  margin: 0;
  font-size: 18px;
}

.body {
  --news-form-max-width: 880px;
  max-width: 880px;
  margin: 0 auto;
}

.text {
  white-space: pre-wrap; /* 本文の改行をそのまま表示 */
  line-height: 1.8;
}

.footer {
  display: flex;
  justify-content: center;
  gap: 8px;
}
</style>