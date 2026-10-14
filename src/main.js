import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import ja from 'element-plus/es/locale/lang/ja'
import { createPinia } from 'pinia'
import App from './App.vue'

const app = createApp(App)

app.use(createPinia())
app.use(ElementPlus, {
  locale: ja,
})
app.mount('#app')