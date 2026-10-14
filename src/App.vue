<script setup>
import { ref, computed, } from 'vue'
import NewsList from '@/components/NewsList.vue'
import NewsForm from '@/components/NewsForm.vue'
import { useNewsStore } from '@/stores/useNewsStore'

const newsStore = useNewsStore()

// 現在選択中のメニュー(初期表示は「ニュース一覧」にしている)
const activeIndex = ref('1')

// 指定したメニューへ画面を切り替える。
// el-menu の :default-active に activeIndex を渡しているので、
// コードから切り替えた場合もメニューのハイライトが追従する。
const goTo = (index) => {
  activeIndex.value = index
}
const menuComponentsItems = [
  {
    index: '1',
    label: 'ニュース一覧',
    component: NewsList,
    events: {
      // 一覧の行クリック → 編集対象を Store にセットして、フォーム画面へ切り替える
      edit: (id) => {
        newsStore.startEdit(id)
        goTo('2')
      },
    },
  },
  {
    index: '2',
    label: '新規登録',
    component: NewsForm,
    events: {
      // 保存・キャンセルのどちらでも一覧へ戻る
      saved: () => goTo('1'),
      cancel: () => goTo('1'),
    },
  },
]

// 選択中のindexに対応するコンポーネントを算出
const currentComponent = computed(() => {
  const target = menuComponentsItems.find((item) => item.index === activeIndex.value)
  return target ? target.component : null
})

// メニュー項目クリック時の処理。el-menu-item のクリックは @open/@close ではなく @select で受け取る。
// 選択されたindexを保持するだけで、表示切替は computed + <component :is> に任せる。
const handleSelect = (key, keyPath) => {
  console.log('選択されたメニュー:', key, keyPath)
  newsStore.clearEditing()
  activeIndex.value = key
}

const currentItem = computed(() =>
  menuComponentsItems.find((item) => item.index === activeIndex.value),
)
// 右側ヘッダーの見出し。title があればそれを、なければ label を使う。
const headerTitle = computed(
  () => currentItem.value?.title ?? currentItem.value?.label ?? '',
)

const currentEvents = computed(() => currentItem.value?.events ?? {})

</script>

<template>
  <el-row class="tac">
    <el-col :span="4">
      <el-menu
        :default-active="activeIndex"
        class="el-menu-vertical-demo"
        @select="handleSelect"
      >
        <el-menu-item
          v-for="item in menuComponentsItems"
          :key="item.index"
          :index="item.index"
        >
          <span>{{ item.label }}</span>
        </el-menu-item>
      </el-menu>
    </el-col>

    <el-col :span="20" class="content-area">
      <header class="content-header">
        <h2>{{ headerTitle }}</h2>
      </header>
      <component :is="currentComponent" v-on="currentEvents" />
    </el-col>
  </el-row>
</template>

<style scoped>
.content-area { 
  padding: 0 20px;
}
</style>