<script setup>
import { reactive, ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useNewsStore } from '@/stores/useNewsStore'

const props = defineProps({
  news: { type: Object, default: undefined },
  categories: { type: Array, default: () => ['お知らせ'] },
  statuses: { type: Array, default: () => ['公開', '非公開'] },
  labelWidth: { type: String, default: '100px' },
})

const emit = defineEmits(['saved', 'cancel'])

const newsStore = useNewsStore()

const formRef = ref(null)

// 保存処理中フラグ(二重送信防止とボタンのローディング表示に使う)
const saving = ref(false)

// 編集対象。props.news が渡されていればそれを優先し、なければ Store を見る。
const target = computed(() =>
  props.news !== undefined ? props.news : newsStore.editingNews,
)

// 編集モードかどうか
const isEdit = computed(() => target.value?.id != null)

// カテゴリの選択肢
// props の基本値と、一覧側でも使っている Store の categories を
// 重複なく合体させる。→ 一覧の絞り込みと同じカテゴリが選べる。
const categoryOptions = computed(() => [
  ...new Set([...props.categories, ...newsStore.categories]),
])

// 今日の日付を 'YYYY-MM-DD' で返す(公開日の初期値用)。
// toISOString() は UTC 基準で、日本では午前中に前日になってしまうため、
// ローカル時刻から組み立てている。
const getToday = () => {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

// 新規登録時の初期値
const createEmptyForm = () => ({
  id: null,
  title: '',
  category: '',
  body: '',
  publishDate: getToday(),
  status: props.statuses[0] ?? '',
})

// フォームの内部状態。Store 側のデータとは別物(コピー)として扱う。
// 保存を押すまで、一覧の表示は変わらない。
const form = reactive(createEmptyForm())

// 編集対象が変わったら、フォームを初期化し直す。
watch(
  target,
  (value) => {
    // 前回の入力内容が残らないよう、キーごと入れ替える
    Object.keys(form).forEach((k) => delete form[k])
    Object.assign(form, createEmptyForm(), value ?? {})
    // 前回の検証エラー表示が残らないようにする
    formRef.value?.clearValidate()
  },
  { immediate: true },
)

// 入力チェックのルール
const rules = {
  title: [
    { required: true, message: 'タイトルを入力してください', trigger: 'blur', whitespace: true },
  ],
  category: [
    { required: true, message: 'カテゴリを選択または入力してください', trigger: 'change' },
  ],
  body: [
    { required: true, message: '本文を入力してください', trigger: 'blur', whitespace: true },
  ],
  publishDate: [
    { required: true, message: '公開日を選択してください', trigger: 'change' },
  ],
  status: [
    { required: true, message: '公開状態を選択してください', trigger: 'change' },
  ],
}

// 保存処理(新規登録 / 更新)：検証 → 前後の空白を除去 → Store に保存 → 結果を通知、の順に行う。
const handleSubmit = async () => {
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  // 保存後に状態が変わるため、メッセージ用に先にモードを退避しておく
  const editing = isEdit.value
  const payload = {
    ...form,
    title: form.title.trim(),
    body: form.body.trim(),
  }

  saving.value = true
  try {
    if (editing) {
      await newsStore.updateNews(payload)
    } else {
      // 新規登録時の id は Store 側で採番するので、フォームの空の id は渡さない
      delete payload.id
      await newsStore.addNews(payload)
    }
    ElMessage.success(editing ? '更新しました' : '登録しました')
    newsStore.clearEditing()
    // 保存済みの内容を渡す(呼び出し側が表示を更新できるように)
    emit('saved', payload)
  } catch (e) {
    console.error(e)
    ElMessage.error('保存に失敗しました。もう一度お試しください')
  } finally {
    saving.value = false
  }
}

// キャンセル:編集状態を破棄して、呼び出し側に知らせる
const handleCancel = () => {
  newsStore.clearEditing()
  emit('cancel')
}
</script>

<template>
  <!-- Enter キーでのページリロードを防ぐため.preventを付けている -->
  <el-form
    ref="formRef"
    :model="form"
    :rules="rules"
    :label-width="labelWidth"
    :disabled="saving"
    class="news-form"
    @submit.prevent="handleSubmit"
  >
    <el-form-item label="タイトル" prop="title">
      <el-input
        v-model="form.title"
        maxlength="100"
        show-word-limit
        placeholder="例:夏季休業のお知らせ"
      />
    </el-form-item>

    <el-form-item label="カテゴリ" prop="category">
      <el-select
        v-model="form.category"
        filterable
        allow-create
        default-first-option
        placeholder="選択または入力"
        class="full-width"
      >
        <el-option v-for="c in categoryOptions" :key="c" :label="c" :value="c" />
      </el-select>
    </el-form-item>

    <el-form-item label="本文" prop="body">
      <el-input
        v-model="form.body"
        type="textarea"
        :rows="10"
        maxlength="2000"
        show-word-limit
        placeholder="詳細を入力してください"
      />
    </el-form-item>

    <el-form-item label="公開日" prop="publishDate">
      <el-date-picker
        v-model="form.publishDate"
        type="date"
        value-format="YYYY-MM-DD"
        format="YYYY年MM月DD日"
        placeholder="日付を選択"
        class="full-width"
      />
    </el-form-item>

    <el-form-item label="公開状態" prop="status">
      <el-radio-group v-model="form.status">
        <el-radio v-for="s in statuses" :key="s" :value="s">{{ s }}</el-radio>
      </el-radio-group>
    </el-form-item>

    <el-form-item>
      <el-button type="primary" native-type="submit" :loading="saving">
        {{ isEdit ? '更新する' : '登録する' }}
      </el-button>
      <el-button @click="handleCancel">キャンセル</el-button>
    </el-form-item>
  </el-form>
</template>

<style scoped>
.news-form {
  /* 親側から --news-form-max-width で幅を変えられる */
  max-width: var(--news-form-max-width, 720px);
}

.full-width {
  width: 100%;
}
</style>