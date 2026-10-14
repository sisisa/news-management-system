<script setup>
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useNewsStore } from '@/stores/useNewsStore'

const newsStore = useNewsStore()
const emit = defineEmits(['edit'])

const {
  keyword,
  selectedCategory,
  categories,
  filteredNews,
} = storeToRefs(newsStore)

// ストアの処理
const { fetchNews, resetSearch } = newsStore

// コンポーネント表示時にニュースを取得
onMounted(() => {
  fetchNews()
})

const handleRowClick = (row) => {
  emit('edit', row.id)
}

</script>

<template>
  <section class="news-list">
    <el-card class="search-card" shadow="never">
      <el-row :gutter="16" align="middle">
        <el-col :xs="24" :sm="12" :md="10">
          <el-input
            v-model="keyword"
            placeholder="タイトルで検索"
            clearable
          />
        </el-col>
 
        <el-col :xs="24" :sm="12" :md="8">
          <el-select
            v-model="selectedCategory"
            placeholder="カテゴリを選択"
            clearable
            class="full-width"
          >
            <el-option
              v-for="category in categories"
              :key="category"
              :label="category"
              :value="category"
            />
          </el-select>
        </el-col>
 
        <el-col :xs="24" :md="6">
          <el-button @click="resetSearch">
            条件をリセット
          </el-button>
        </el-col>
      </el-row>
    </el-card>
 
    <el-card shadow="never">
      <div class="table-header">
        <span class="result-count">
          行をクリックすると詳細・編集画面を開く事が出来ます (データ：{{ filteredNews.length }} 件)
        </span>
      </div>
 
      <!-- @row-click:行のどこをクリックしても編集画面へ進める -->
      <el-table
        :data="filteredNews"
        row-key="id"
        empty-text="該当するニュースがありません"
        stripe
        style="width: 100%"
        class="clickable-table"
        @row-click="handleRowClick"
      >
        <el-table-column
          prop="title"
          label="タイトル"
          min-width="220"
          show-overflow-tooltip
        />
 
        <el-table-column
          prop="category"
          label="カテゴリ"
          width="140"
        />
 
        <!-- JSON の項目名(publishDate)に合わせている -->
        <el-table-column
          prop="publishDate"
          label="公開日"
          width="130"
        />
 
        <el-table-column label="公開状態" width="110">
          <template #default="{row}">
            <el-tag
              :type="row.status === '公開' ? 'success' : 'info'"
              effect="light"
            >
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </section>
</template>

<style scoped>
.news-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.search-card {
  margin-bottom: 0;
}

.full-width {
  width: 100%;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  font-weight: 600;
}

.result-count {
  font-size: 18px;
  font-weight: bold;
}

/* 行クリックで開けることが伝わるよう、行にカーソルを出す */
.clickable-table :deep(.el-table__row) {
  cursor: pointer;
}

@media (max-width: 767px) {
  .search-card :deep(.el-col) {
    margin-bottom: 12px;
  }
}
</style>